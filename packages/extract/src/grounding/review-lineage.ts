import {
  LineageDocumentSchema,
  MAX_DERIVATION_INPUTS,
  jsonValuesEqual,
  type ApprovalAssertion,
  type DerivationInput,
  type Entity,
  type LineageDocument,
} from '@openparser/lineage';
import { createHash } from 'node:crypto';
import { canonicalSha256 } from '../hash';
import {
  approversByPointerFromEvents,
  liveCompletionEvent,
  liveFieldConfirmedEvents,
  type CompletionReviewEvent,
  type ExtractionReviewEvent,
  type FieldConfirmedReviewEvent,
} from '../review-events';

/** `LineageIdSchema` is any trimmed 1–512 character string; no charset. */
const LINEAGE_ID_MAX_LENGTH = 512;
const REVIEWER_AGENT_PREFIX = 'agent:reviewer:';
const ACTOR_HASH_LENGTH = 8;
/** Conservative actor fragment so agent ids stay in the `agent:ocr-model` family. */
const DISALLOWED_ACTOR_RUNS = /[^A-Za-z0-9._-]+/g;

function actorFingerprint(actorId: string): string {
  return createHash('sha256').update(actorId).digest('hex').slice(0, ACTOR_HASH_LENGTH);
}

/**
 * One human → one agent id: `agent:reviewer:<actor_id>`.
 *
 * Disallowed runs (anything outside `[A-Za-z0-9._-]`) collapse to `_`, then
 * leading/trailing `_` are stripped. When that rewrite (or trim, or truncation
 * to the 512-char id budget) actually changes the actor string, an 8-hex
 * sha256 of the original `actor_id` is appended so distinct actors cannot
 * collide. Typical ids such as `user-1` pass through unchanged.
 */
function reviewerAgentId(actorId: string): string {
  const trimmed = actorId.trim();
  const rewritten = trimmed
    .replace(DISALLOWED_ACTOR_RUNS, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const fragment = rewritten.length > 0 ? rewritten : 'actor';
  const hash = actorFingerprint(actorId);
  const changed = trimmed !== actorId || fragment !== trimmed;
  const suffix = changed ? `-${hash}` : '';
  const id = `${REVIEWER_AGENT_PREFIX}${fragment}${suffix}`;
  if (id.length <= LINEAGE_ID_MAX_LENGTH) return id;
  const budget = LINEAGE_ID_MAX_LENGTH - REVIEWER_AGENT_PREFIX.length - 1 - ACTOR_HASH_LENGTH;
  return `${REVIEWER_AGENT_PREFIX}${fragment.slice(0, Math.max(1, budget))}-${hash}`;
}

function ensureReviewerAgent(lineage: LineageDocument, actorId: string): string {
  const id = reviewerAgentId(actorId);
  lineage.agents[id] ??= { type: 'human', name: actorId };
  return id;
}

/**
 * One assertion per agent: a quorum counts people, not clicks. Replacing the
 * earlier row keeps `at` and `note` as the latest sign-off instead of appending
 * a second assertion that would read as a second approver.
 */
function upsertEntityApproval(entity: Entity, assertion: ApprovalAssertion): void {
  const existing = entity.approvals ?? [];
  const index = existing.findIndex((approval) => approval.agent === assertion.agent);
  entity.approvals =
    index === -1
      ? [...existing, assertion]
      : existing.map((approval, i) => (i === index ? assertion : approval));
}

function currentFieldEntities(lineage: LineageDocument): Map<string, string> {
  return new Map(
    Object.entries(lineage.entities).flatMap(([id, entity]) => {
      const path = entity.path;
      // Empty path is the whole document (review snapshot), not a field.
      return typeof path === 'string' && path !== '' ? [[path, id] as const] : [];
    })
  );
}

/** Current field entity ids: original `outputs` order, then any new paths sorted. */
function currentOutputEntityIds(
  currentByPath: ReadonlyMap<string, string>,
  originalOutputs: readonly string[],
  entities: LineageDocument['entities']
): string[] {
  const remaining = new Map(currentByPath);
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const originalId of originalOutputs) {
    const path = entities[originalId]?.path;
    if (typeof path !== 'string' || path === '') continue;
    const currentId = remaining.get(path);
    if (!currentId || seen.has(currentId)) continue;
    seen.add(currentId);
    remaining.delete(path);
    ids.push(currentId);
  }

  const extras = [...remaining.entries()].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0
  );
  for (const [, id] of extras) {
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function childPath(parent: string, segment: string): string {
  const escaped = segment.replaceAll('~', '~0').replaceAll('/', '~1');
  return `${parent}/${escaped}`;
}

function isDescendantPath(candidate: string, parent: string): boolean {
  return candidate.startsWith(`${parent}/`);
}

function collectReviewLeaves(
  path: string,
  value: unknown
): Array<{ path: string; value: unknown }> {
  if (Array.isArray(value)) {
    if (value.length === 0) return [{ path, value }];
    return value.flatMap((item, index) =>
      collectReviewLeaves(childPath(path, String(index)), item)
    );
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return [{ path, value }];
    return entries.flatMap(([key, item]) => collectReviewLeaves(childPath(path, key), item));
  }
  return [{ path, value }];
}

function previousEntitiesForPath(
  currentByPath: ReadonlyMap<string, string>,
  path: string
): string[] {
  const exact = currentByPath.get(path);
  if (exact) return [exact];
  const descendants = [...currentByPath.entries()]
    .filter(([candidate]) => isDescendantPath(candidate, path))
    .map(([, entity]) => entity);
  if (descendants.length > 0) return descendants;
  const ancestor = [...currentByPath.entries()]
    .filter(([candidate]) => isDescendantPath(path, candidate))
    .sort(([left], [right]) => right.length - left.length)[0];
  return ancestor ? [ancestor[1]] : [];
}

export class ReviewLineagePathError extends Error {
  constructor(readonly path: string) {
    super(`review path has no matching lineage entity: ${path}`);
    this.name = 'ReviewLineagePathError';
  }
}

function reduceInputs(input: {
  lineage: LineageDocument;
  activityId: string;
  idPrefix: string;
  entityIds: string[];
  role: string;
}): string[] {
  const { lineage, activityId, idPrefix, role } = input;
  let level = [...new Set(input.entityIds)];
  let depth = 0;
  while (level.length > MAX_DERIVATION_INPUTS) {
    const next: string[] = [];
    for (let start = 0; start < level.length; start += MAX_DERIVATION_INPUTS) {
      const chunk = level.slice(start, start + MAX_DERIVATION_INPUTS);
      const chunkId = `${idPrefix}:level:${depth}:chunk:${start / MAX_DERIVATION_INPUTS}`;
      lineage.entities[chunkId] = {
        kind: 'collection',
        name: `Lineage input chunk ${start / MAX_DERIVATION_INPUTS + 1}`,
      };
      lineage.derivations.push({
        output: chunkId,
        activity: activityId,
        inputs: chunk.map((entity) => ({ entity, role, effect: 'direct' })),
        transformation: { type: 'aggregation' },
      });
      next.push(chunkId);
    }
    level = next;
    depth += 1;
  }
  return level;
}

function aggregateReviewedOutput(input: {
  lineage: LineageDocument;
  version: number;
  correctedOutput: unknown;
  fieldEntityIds: string[];
}): string {
  const { lineage, version, correctedOutput, fieldEntityIds } = input;
  const activityId = `activity:review-snapshot:${version}`;
  lineage.activities[activityId] = {
    type: 'review.snapshot',
    name: 'Snapshot reviewed output',
    status: 'ended',
  };

  const level = reduceInputs({
    lineage,
    activityId,
    idPrefix: `review:snapshot:${version}`,
    entityIds: fieldEntityIds,
    role: 'field',
  });

  const snapshotId = `review:output:${version}`;
  lineage.entities[snapshotId] = {
    kind: 'value',
    name: 'Corrected output',
    path: '',
    // `DigestSchema.algorithm` is an open string; the format example is `sha256`.
    digest: { algorithm: 'sha256', value: canonicalSha256(correctedOutput) },
    attributes: { 'openparser:reviewVersion': version },
  };
  lineage.derivations.push({
    output: snapshotId,
    activity: activityId,
    inputs: level.map((entity): DerivationInput => ({ entity, role: 'field', effect: 'direct' })),
    transformation: { type: 'aggregation' },
  });
  return snapshotId;
}

/** Same value as before: a sign-off, not a new revision of the entity. */
function confirmationChangesValue(event: FieldConfirmedReviewEvent): boolean {
  return event.previous_value === undefined || !jsonValuesEqual(event.previous_value, event.value);
}

/**
 * Standing is derived from the log, not stored as approve/withdraw events.
 * Stamp it on the current field entities after the value chain is built so a
 * retracted confirmation cannot leave an assertion on the predecessor.
 */
function stampStandingApprovals(input: {
  lineage: LineageDocument;
  currentByPath: ReadonlyMap<string, string>;
  events: readonly ExtractionReviewEvent[];
}): void {
  const live = liveFieldConfirmedEvents(input.events);
  for (const [path, actors] of approversByPointerFromEvents(input.events)) {
    const exact = input.currentByPath.get(path);
    const entityIds = exact ? [exact] : previousEntitiesForPath(input.currentByPath, path);
    if (entityIds.length === 0) {
      throw new ReviewLineagePathError(path);
    }
    for (const actorId of actors) {
      const confirmation = [...live]
        .reverse()
        .find((event) => event.path === path && event.actor_id === actorId);
      if (!confirmation) continue;
      const agentId = ensureReviewerAgent(input.lineage, actorId);
      for (const entityId of entityIds) {
        const entity = input.lineage.entities[entityId];
        if (!entity) {
          throw new ReviewLineagePathError(path);
        }
        upsertEntityApproval(entity, {
          agent: agentId,
          at: confirmation.created_at,
          ...(confirmation.note ? { note: confirmation.note } : {}),
        });
      }
    }
  }
}

/**
 * Append durable review events to an extraction DAG without mutating machine
 * entities. A confirmation that changes a value creates a new revision; a
 * confirmation of the standing value only signs it. Completion creates a
 * decision derived from a corrected-output snapshot.
 */
export function appendExtractionReviewLineage(input: {
  lineage: LineageDocument;
  correctedOutput: unknown;
  events: ExtractionReviewEvent[];
}): LineageDocument {
  const lineage = structuredClone(input.lineage);
  const originalOutputs = [...lineage.outputs];
  const currentByPath = currentFieldEntities(lineage);
  const liveConfirmations = new Set(liveFieldConfirmedEvents(input.events));
  // A withdrawn sign-off mints no decision node, the same way a retracted
  // confirmation leaves no value revision: the log remembers, the graph does not.
  const live = liveCompletionEvent(input.events);
  let completion: { event: CompletionReviewEvent; ordinal: number } | undefined;
  let liveValueChanges = 0;

  input.events.forEach((event, ordinal) => {
    if (event.type === 'field_confirmed') {
      // Retracted tips are omitted so the chain reads as if that confirmation
      // was never made. The event log keeps the retraction; the graph does not.
      if (!liveConfirmations.has(event)) {
        return;
      }
      if (!confirmationChangesValue(event)) {
        return;
      }
      liveValueChanges += 1;
      const agentId = ensureReviewerAgent(lineage, event.actor_id);
      const activityId = `activity:review-confirm:${event.version}:${ordinal}`;
      const leaves = collectReviewLeaves(event.path, event.value);
      const replacements = leaves.map((leaf, leafIndex) => {
        const previousForLeaf = previousEntitiesForPath(currentByPath, leaf.path);
        const previousEntityIds =
          previousForLeaf.length > 0
            ? previousForLeaf
            : previousEntitiesForPath(currentByPath, event.path);
        if (previousEntityIds.length === 0) {
          throw new ReviewLineagePathError(event.path);
        }
        const entityId = `review:value:${event.version}:${ordinal}${
          leaves.length > 1 ? `:${leafIndex}` : ''
        }`;
        const derivationInputs = reduceInputs({
          lineage,
          activityId,
          idPrefix: `review:confirm-inputs:${event.version}:${ordinal}:${leafIndex}`,
          entityIds: previousEntityIds,
          role: 'previous_value',
        });
        lineage.entities[entityId] = {
          kind: 'value',
          value: leaf.value as LineageDocument['entities'][string]['value'],
          path: leaf.path,
          attributions: [{ agent: agentId, role: 'reviewer' }],
          attributes: {
            'openparser:reviewVersion': event.version,
            'openparser:reviewEvent': 'field_confirmed',
          },
        };
        lineage.derivations.push({
          output: entityId,
          activity: activityId,
          inputs: derivationInputs.map((entity) => ({
            entity,
            role: 'previous_value',
            effect: 'direct',
          })),
          transformation: { type: 'transformation' },
        });
        return [leaf.path, entityId] as const;
      });
      lineage.activities[activityId] = {
        type: 'review.confirm',
        name: `Review ${event.path}`,
        status: 'ended',
        endedAt: event.created_at,
        associations: [{ agent: agentId, role: 'reviewer' }],
      };
      for (const candidate of [...currentByPath.keys()]) {
        if (candidate === event.path || isDescendantPath(candidate, event.path)) {
          currentByPath.delete(candidate);
        }
      }
      for (const [path, entityId] of replacements) {
        currentByPath.set(path, entityId);
      }
      return;
    }

    if (event === live) {
      completion = { event: live, ordinal };
    }
  });

  stampStandingApprovals({ lineage, currentByPath, events: input.events });

  // Sign-offs are assertions on existing entities. They must not mint
  // snapshot/decision nodes or rewrite `outputs`; only value-changing
  // confirmations and completion do.
  const projectsReviewGraph = liveValueChanges > 0 || completion !== undefined;
  if (!projectsReviewGraph) {
    return LineageDocumentSchema.parse(lineage);
  }

  const version = input.events.at(-1)!.version;
  const snapshotId = aggregateReviewedOutput({
    lineage,
    version,
    correctedOutput: input.correctedOutput,
    fieldEntityIds: [...new Set(currentByPath.values())],
  });
  // Current field entities remain the field index; the snapshot is additional.
  lineage.outputs = [
    ...currentOutputEntityIds(currentByPath, originalOutputs, lineage.entities),
    snapshotId,
  ];

  if (completion) {
    const { event, ordinal } = completion;
    const agentId = ensureReviewerAgent(lineage, event.actor_id);
    const decisionId = `review:decision:${event.version}:${ordinal}`;
    const activityId = `activity:review-${event.type}:${event.version}:${ordinal}`;
    lineage.entities[decisionId] = {
      kind: 'decision',
      name: `Extraction ${event.type}`,
      value: event.type,
      attributions: [{ agent: agentId, role: 'reviewer' }],
      attributes: {
        'openparser:reviewVersion': event.version,
        ...(event.note ? { 'openparser:reviewNote': event.note } : {}),
      },
    };
    lineage.activities[activityId] = {
      type: `review.${event.type}`,
      name: `Complete review as ${event.type}`,
      status: 'ended',
      endedAt: event.created_at,
      associations: [{ agent: agentId, role: 'reviewer' }],
    };
    lineage.derivations.push({
      output: decisionId,
      activity: activityId,
      inputs: [{ entity: snapshotId, role: 'reviewed_output', effect: 'direct' }],
      transformation: { type: 'identity' },
    });
    lineage.outputs.push(decisionId);
  }

  return LineageDocumentSchema.parse(lineage);
}
