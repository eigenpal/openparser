import { derivationId } from './derivation';
import type { LineageDocument } from './document';

export class LineageValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join('; '));
    this.name = 'LineageValidationError';
    this.issues = issues;
  }
}

/**
 * Strict graph validation beyond Zod shape checks.
 *
 * Ensures globally distinct ids, resolvable references, unique derivation
 * outputs (one producer), no self-inputs, acyclic entity dependencies,
 * valid collection membership, and coherent activity timestamps.
 */
export function validateLineageGraph(doc: LineageDocument): void {
  const issues: string[] = [];

  const entityIds = new Set(Object.keys(doc.entities));
  const activityIds = new Set(Object.keys(doc.activities));
  const agentIds = new Set(Object.keys(doc.agents));

  const idsOfKind = { entity: entityIds, activity: activityIds, agent: agentIds } as const;

  /** Every cross-reference in a document resolves through here, so none is missed. */
  const requireRef = (kind: keyof typeof idsOfKind, id: string, where: string) => {
    if (!idsOfKind[kind].has(id)) issues.push(`${where}: ${kind} "${id}" does not exist`);
  };
  const requireConfidenceRefs = (
    confidence:
      | { sources?: ReadonlyArray<{ type: keyof typeof idsOfKind; id: string }> }
      | undefined,
    where: string
  ) => {
    for (const source of confidence?.sources ?? []) {
      requireRef(source.type, source.id, `${where}.sources`);
    }
  };

  // Globally distinct IDs across entity / activity / agent maps.
  const claimed = new Map<string, string>();
  for (const [bucket, ids] of [
    ['entities', entityIds],
    ['activities', activityIds],
    ['agents', agentIds],
  ] as const) {
    for (const id of ids) {
      const prior = claimed.get(id);
      if (prior) {
        issues.push(`id "${id}" collides across ${prior} and ${bucket}`);
      } else {
        claimed.set(id, bucket);
      }
    }
  }

  // Derivation ids must be unique and not collide with map keys.
  const derivationIds = new Set<string>();
  const outputProducers = new Map<string, string>();

  for (let i = 0; i < doc.derivations.length; i++) {
    const derivation = doc.derivations[i]!;
    const path = `derivations[${i}]`;

    const id = derivationId(derivation);

    if (derivationIds.has(id)) {
      issues.push(`${path}: duplicate derivation id "${id}"`);
    }
    derivationIds.add(id);

    if (claimed.has(id)) {
      issues.push(`${path}: derivation id "${id}" collides with ${claimed.get(id)}`);
    }

    if (!entityIds.has(derivation.output)) {
      issues.push(`${path}: output entity "${derivation.output}" does not exist`);
    } else {
      const prior = outputProducers.get(derivation.output);
      if (prior) {
        issues.push(
          `${path}: entity "${derivation.output}" already has producer derivation "${prior}" (one producer per derived output)`
        );
      } else {
        outputProducers.set(derivation.output, id);
      }
    }

    requireRef('activity', derivation.activity, path);

    const inputEntities = new Set<string>();
    for (let j = 0; j < derivation.inputs.length; j++) {
      const input = derivation.inputs[j]!;
      const inputPath = `${path}.inputs[${j}]`;
      requireRef('entity', input.entity, inputPath);
      if (input.entity === derivation.output) {
        issues.push(`${inputPath}: output cannot be its own input`);
      }
      if (inputEntities.has(input.entity)) {
        issues.push(`${inputPath}: duplicate input entity "${input.entity}"`);
      }
      inputEntities.add(input.entity);
      requireConfidenceRefs(input.confidence, `${inputPath}.confidence`);
    }

    requireConfidenceRefs(derivation.confidence, `${path}.confidence`);
  }

  // Document outputs resolve.
  const seenOutputs = new Set<string>();
  for (let i = 0; i < doc.outputs.length; i++) {
    const outputId = doc.outputs[i]!;
    if (!entityIds.has(outputId)) {
      issues.push(`outputs[${i}]: entity "${outputId}" does not exist`);
    }
    if (seenOutputs.has(outputId)) {
      issues.push(`outputs[${i}]: duplicate entity "${outputId}"`);
    }
    seenOutputs.add(outputId);
  }

  // Entity attributions, sign-offs, and confidence sources.
  for (const [entityId, entity] of Object.entries(doc.entities)) {
    const entityPath = `entities.${entityId}`;
    entity.attributions?.forEach((attribution, i) => {
      requireRef('agent', attribution.agent, `${entityPath}.attributions[${i}]`);
    });
    entity.approvals?.forEach((approval, i) => {
      requireRef('agent', approval.agent, `${entityPath}.approvals[${i}]`);
    });
    entity.confidence?.forEach((assertion, i) => {
      requireConfidenceRefs(assertion, `${entityPath}.confidence[${i}]`);
    });
  }

  // Activity associations + timestamp ordering. RFC 3339 syntax is a shape
  // check; this pass still rejects NaN instants if a document bypassed parse.
  for (const [activityId, activity] of Object.entries(doc.activities)) {
    activity.associations?.forEach((association, i) => {
      requireRef('agent', association.agent, `activities.${activityId}.associations[${i}]`);
    });

    const { startedAt, endedAt } = activity;
    if (startedAt !== undefined && endedAt !== undefined) {
      const startedMs = Date.parse(startedAt);
      const endedMs = Date.parse(endedAt);
      if (Number.isNaN(startedMs) || Number.isNaN(endedMs)) {
        issues.push(
          `activities.${activityId}: startedAt or endedAt is not a valid RFC 3339 timestamp`
        );
      } else if (endedMs < startedMs) {
        issues.push(`activities.${activityId}: endedAt precedes startedAt`);
      }
    }
  }

  // Relations: resolve + collection membership correctness.
  for (let i = 0; i < doc.relations.length; i++) {
    const relation = doc.relations[i]!;
    const path = `relations[${i}]`;
    requireRef('entity', relation.source, `${path}.source`);
    requireRef('entity', relation.target, `${path}.target`);
    if (
      relation.type === 'member_of' &&
      entityIds.has(relation.target) &&
      doc.entities[relation.target]?.kind !== 'collection'
    ) {
      issues.push(`${path}: member_of target "${relation.target}" must be a collection entity`);
    }
  }

  // Entity dependency graph via derivations must be acyclic.
  const dependents = new Map<string, string[]>();
  for (const id of entityIds) dependents.set(id, []);
  for (const derivation of doc.derivations) {
    if (!entityIds.has(derivation.output)) continue;
    for (const input of derivation.inputs) {
      if (!entityIds.has(input.entity)) continue;
      dependents.get(input.entity)!.push(derivation.output);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cyclePath: string[] = [];

  const visit = (id: string): boolean => {
    if (visited.has(id)) return false;
    if (visiting.has(id)) {
      cyclePath.push(id);
      return true;
    }
    visiting.add(id);
    for (const next of dependents.get(id) ?? []) {
      if (visit(next)) {
        cyclePath.push(id);
        return true;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  for (const id of entityIds) {
    if (visit(id)) {
      const cycle = [...new Set(cyclePath.reverse())].join(' → ');
      issues.push(`entity dependency cycle detected: ${cycle}`);
      break;
    }
  }

  if (issues.length > 0) {
    throw new LineageValidationError(issues);
  }
}
