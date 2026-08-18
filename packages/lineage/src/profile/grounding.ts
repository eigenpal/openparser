/**
 * Whether a field's evidence is sufficient, as the OpenParser profile defines it.
 *
 * `lineage@1` records what a value was derived from; it takes no position on when
 * that is enough, because "enough" depends on what the producer was able to
 * resolve. OpenParser answers it with one attribute on the producer derivation —
 * the source ids the model named that could not be resolved to a region — so the
 * rule reads a `openparser:` key and belongs here rather than in the protocol.
 */

import type { Derivation } from '../derivation';
import type { LineageDocument } from '../document';
import { fieldTrace } from '../fields';
import { entityAncestors } from '../traverse';

const DROPPED_SOURCES_ATTR = 'openparser:droppedSourceIds';

/** Whether a field is backed by source evidence, partially backed, or unbacked. */
export type GroundingStatus = 'grounded' | 'partial' | 'ungrounded';

export type FieldGrounding = {
  status: GroundingStatus;
  /** Source ids the producer cited but could not resolve to a region. */
  droppedSourceIds: string[];
};

/** Source ids the producer named but could not resolve to a region. */
export function droppedSourceIds(producer: Derivation | undefined): string[] {
  const dropped = producer?.attributes?.[DROPPED_SOURCES_ATTR];
  return Array.isArray(dropped) ? dropped.filter((id): id is string => typeof id === 'string') : [];
}

/**
 * Grounding is read off the graph rather than stored: the evidence a value
 * actually reaches, less the sources its producer could not resolve.
 *
 * Callers that already walked to the evidence pass the count, since how far a
 * given consumer follows the graph is its own business.
 */
export function groundingStatus(options: {
  evidenceCount: number;
  droppedSourceIds: string[];
}): GroundingStatus {
  if (options.evidenceCount === 0) return 'ungrounded';
  return options.droppedSourceIds.length > 0 ? 'partial' : 'grounded';
}

function collectDroppedSourceIds(doc: LineageDocument, entityIds: Iterable<string>): string[] {
  const relevant = new Set(entityIds);
  const seen = new Set<string>();
  const dropped: string[] = [];
  for (const derivation of doc.derivations) {
    if (!relevant.has(derivation.output)) continue;
    for (const id of droppedSourceIds(derivation)) {
      if (seen.has(id)) continue;
      seen.add(id);
      dropped.push(id);
    }
  }
  return dropped;
}

/** Grounding for the field at a JSON Pointer, walking the graph to its evidence. */
export function fieldGrounding(doc: LineageDocument, pointer: string): FieldGrounding | undefined {
  const trace = fieldTrace(doc, pointer);
  if (!trace) return undefined;

  const ancestorIds = entityAncestors(doc, trace.field.id);
  const dropped = collectDroppedSourceIds(doc, [trace.field.id, ...ancestorIds]);
  return {
    status: groundingStatus({ evidenceCount: trace.evidence.length, droppedSourceIds: dropped }),
    droppedSourceIds: dropped,
  };
}
