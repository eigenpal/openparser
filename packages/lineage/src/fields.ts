import type { JsonValue } from './common';
import type { ConfidenceAssertion, ConfidenceKind } from './confidence';
import type { LineageDocument } from './document';
import type { Entity } from './entity';
import { entityAncestors } from './traverse';

/** How a field's confidence came about, or that none was asserted at all. */
export type ConfidenceOrigin = ConfidenceKind | 'not_reported';

export type LineageField = {
  id: string;
  pointer: string;
  /**
   * Display-only dotted rendering of `pointer`. Lossy: a property whose name
   * contains a dot is indistinguishable from nesting. Use `pointer` as the key.
   */
  dottedPath: string;
  value: JsonValue | undefined;
  confidence: ConfidenceAssertion | undefined;
  confidenceOrigin: ConfidenceOrigin;
  entity: Entity;
};

export type LineageFieldTrace = {
  field: LineageField;
  evidence: Array<{ id: string; entity: Entity }>;
  activities: string[];
};

/** RFC 6901 pointer for an output entity. `path` is the only field locator. */
function fieldPointer(entity: Entity): string {
  return entity.path ?? '';
}

/** Most relevant confidence assertion: extraction-scoped, else the first. */
function fieldConfidence(entity: Entity): ConfidenceAssertion | undefined {
  const assertions = entity.confidence;
  if (!assertions || assertions.length === 0) return undefined;
  return assertions.find((assertion) => assertion.scope === 'extraction') ?? assertions[0];
}

/**
 * RFC 6901 pointer to dotted display path, unescaping `~1` and `~0`.
 *
 * Display only. A property whose name contains a dot is indistinguishable from
 * nesting, so never use the result as a key.
 */
export function dottedPathFromPointer(pointer: string): string {
  if (pointer === '' || pointer === '/') return '';
  return pointer
    .replace(/^\//, '')
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    .join('.');
}

/**
 * Dotted display path back to an RFC 6901 pointer, escaping `~` and `/`.
 *
 * Only sound for paths `dottedPathFromPointer` could have produced: a property
 * name containing a dot round-trips as nesting. Prefer carrying the pointer.
 */
export function pointerFromDottedPath(dottedPath: string): string {
  if (dottedPath === '') return '';
  return `/${dottedPath
    .split('.')
    .map((segment) => segment.replaceAll('~', '~0').replaceAll('/', '~1'))
    .join('/')}`;
}

/**
 * The entity holding a field's current value at `pointer`.
 *
 * Precedence is explicit and does not use `Object.entries` insertion order:
 * 1. An entity at that path listed in `doc.outputs` — after review, `outputs`
 *    is the current field set (plus a root snapshot / completion decision,
 *    which do not share field paths). If several outputs match, the earliest
 *    in `doc.outputs` wins.
 * 2. Otherwise a `kind: 'decision'` entity at that path (the producer-settled
 *    value on documents that never went through review). If several decisions
 *    match, the lexicographically smallest id wins.
 * 3. Otherwise the lexicographically smallest id among remaining matches.
 *
 * `path` is the only field locator, so this is the single supported way to go
 * from a pointer to an entity id — ids themselves are not a stable contract.
 */
export function fieldEntityByPointer(
  doc: LineageDocument,
  pointer: string
): { id: string; entity: Entity } | undefined {
  const matching = Object.entries(doc.entities).filter(([, entity]) => entity.path === pointer);
  if (matching.length === 0) return undefined;

  const matchingIds = new Set(matching.map(([id]) => id));
  const outputId = doc.outputs.find((id) => matchingIds.has(id));
  if (outputId) {
    const entity = doc.entities[outputId];
    if (entity) return { id: outputId, entity };
  }

  const ranked = matching.toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  const decision = ranked.find(([, entity]) => entity.kind === 'decision');
  const chosen = decision ?? ranked[0];
  return chosen ? { id: chosen[0], entity: chosen[1] } : undefined;
}

function toField(id: string, entity: Entity): LineageField {
  const pointer = fieldPointer(entity);
  const confidence = fieldConfidence(entity);
  return {
    id,
    pointer,
    dottedPath: dottedPathFromPointer(pointer),
    value: entity.value,
    confidence,
    confidenceOrigin: confidence ? confidence.kind : 'not_reported',
    entity,
  };
}

/** Output field entities as fields, in `doc.outputs` order.
 *
 * Whole-document snapshots (`path === ''`) and other pathless outputs are
 * omitted — they are the whole result (or a run-level decision), not a field.
 */
export function fields(doc: LineageDocument): LineageField[] {
  const result: LineageField[] = [];
  for (const id of doc.outputs) {
    const entity = doc.entities[id];
    if (!entity) continue;
    if (fieldPointer(entity) === '') continue;
    result.push(toField(id, entity));
  }
  return result;
}

/**
 * Trace a field by JSON Pointer, including upstream evidence and activities.
 *
 * Whether that evidence is *sufficient* is a question for whoever produced the
 * document, since it turns on their own attributes; see the OpenParser profile
 * for one answer.
 */
export function fieldTrace(doc: LineageDocument, pointer: string): LineageFieldTrace | undefined {
  const field = fields(doc).find((candidate) => candidate.pointer === pointer);
  if (!field) return undefined;

  const ancestorIds = entityAncestors(doc, field.id);
  const evidence = ancestorIds
    .filter((id) => {
      const entity = doc.entities[id];
      return entity?.kind === 'collection' || entity?.kind === 'evidence';
    })
    .sort()
    .map((id) => ({ id, entity: doc.entities[id]! }));

  const relevant = new Set([field.id, ...ancestorIds]);
  const activities = [
    ...new Set(doc.derivations.filter((d) => relevant.has(d.output)).map((d) => d.activity)),
  ].sort();

  return { field, evidence, activities };
}
