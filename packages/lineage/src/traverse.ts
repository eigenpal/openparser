import type { LineageDocument } from './document';

/** Build adjacency: entity → entities derived from it (children / descendants direction). */
function buildForwardEdges(doc: LineageDocument): Map<string, string[]> {
  const edges = new Map<string, string[]>();
  for (const id of Object.keys(doc.entities)) edges.set(id, []);
  for (const derivation of doc.derivations) {
    if (!(derivation.output in doc.entities)) continue;
    for (const input of derivation.inputs) {
      if (!(input.entity in doc.entities)) continue;
      edges.get(input.entity)!.push(derivation.output);
    }
  }
  return edges;
}

/** Build adjacency: entity → entities it was derived from (parents / ancestors direction). */
function buildReverseEdges(doc: LineageDocument): Map<string, string[]> {
  const edges = new Map<string, string[]>();
  for (const id of Object.keys(doc.entities)) edges.set(id, []);
  for (const derivation of doc.derivations) {
    if (!(derivation.output in doc.entities)) continue;
    for (const input of derivation.inputs) {
      if (!(input.entity in doc.entities)) continue;
      edges.get(derivation.output)!.push(input.entity);
    }
  }
  return edges;
}

/**
 * Topological order of entity ids following derivation dependencies
 * (inputs before outputs). Stable for disconnected nodes by insertion order
 * of `Object.keys(entities)`.
 */
export function topologicalEntityOrder(doc: LineageDocument): string[] {
  const forward = buildForwardEdges(doc);
  const indegree = new Map<string, number>();
  for (const id of Object.keys(doc.entities)) indegree.set(id, 0);
  for (const [, targets] of forward) {
    for (const t of targets) {
      indegree.set(t, (indegree.get(t) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const id of Object.keys(doc.entities)) {
    if ((indegree.get(id) ?? 0) === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of forward.get(id) ?? []) {
      const nextDeg = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDeg);
      if (nextDeg === 0) queue.push(next);
    }
  }

  if (order.length !== Object.keys(doc.entities).length) {
    throw new Error('entity dependency graph contains a cycle');
  }
  return order;
}

function collectReachable(start: string, edges: Map<string, string[]>): string[] {
  if (!edges.has(start)) return [];
  const seen = new Set<string>();
  const stack = [...(edges.get(start) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of edges.get(id) ?? []) {
      if (!seen.has(next)) stack.push(next);
    }
  }
  return [...seen];
}

/** All entities reachable upstream via derivation inputs (transitive). */
export function entityAncestors(doc: LineageDocument, entityId: string): string[] {
  return collectReachable(entityId, buildReverseEdges(doc));
}

/** All entities reachable downstream via derivation outputs (transitive). */
export function entityDescendants(doc: LineageDocument, entityId: string): string[] {
  return collectReachable(entityId, buildForwardEdges(doc));
}
