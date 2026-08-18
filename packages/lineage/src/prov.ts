import { derivationId } from './derivation';
import type { LineageDocument } from './document';

/**
 * Subset of W3C PROV-JSON used for interoperability export.
 *
 * Note: PROV-JSON itself is a W3C Member Submission
 * (https://www.w3.org/Submission/2013/SUBM-prov-json-20130424/).
 * The conceptual model is PROV-DM, a W3C Recommendation
 * (https://www.w3.org/TR/prov-dm/).
 */
export type ProvJsonDocument = {
  prefix?: Record<string, string>;
  entity?: Record<string, Record<string, unknown>>;
  activity?: Record<string, Record<string, unknown>>;
  agent?: Record<string, Record<string, unknown>>;
  wasDerivedFrom?: Record<string, Record<string, unknown>>;
  wasGeneratedBy?: Record<string, Record<string, unknown>>;
  used?: Record<string, Record<string, unknown>>;
  wasAssociatedWith?: Record<string, Record<string, unknown>>;
  wasAttributedTo?: Record<string, Record<string, unknown>>;
  hadMember?: Record<string, Record<string, unknown>>;
  specializationOf?: Record<string, Record<string, unknown>>;
  alternateOf?: Record<string, Record<string, unknown>>;
};

/**
 * Where the `lineage@1` vocabulary is published, so PROV consumers can resolve
 * the `lineage:` prefix. It names the format, not a producer — a document emitted
 * by anyone binds the same prefix. Moving it breaks every consumer that has
 * already resolved a term against it, so it is versioned with the format itself.
 */
export const LINEAGE_PROV_NAMESPACE = 'https://openparser.dev/ns/lineage#';

export function lineageIdToProvQualifiedName(id: string): string {
  const encoded = [...new TextEncoder().encode(id)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `lineage:id_${encoded}`;
}
const qname = lineageIdToProvQualifiedName;

/**
 * Map a validated `lineage@1` document to W3C PROV-JSON concepts.
 *
 * Derivations expand to `wasDerivedFrom` (per input), `wasGeneratedBy`
 * (output ← activity), and `used` (activity ← input). Associations,
 * attributions, and membership follow PROV relations.
 */
export function toProvJson(doc: LineageDocument): ProvJsonDocument {
  const out: ProvJsonDocument = {
    prefix: {
      prov: 'http://www.w3.org/ns/prov#',
      lineage: LINEAGE_PROV_NAMESPACE,
    },
  };

  const entities: Record<string, Record<string, unknown>> = {};
  for (const [id, entity] of Object.entries(doc.entities)) {
    const record: Record<string, unknown> = flattenAttrs(entity.attributes);
    record['prov:type'] = entity.kind;
    record['lineage:id'] = id;
    if (entity.name) record['prov:label'] = entity.name;
    if (entity.value !== undefined) record['lineage:value'] = entity.value;
    // The empty pointer addresses the whole document, so absence is the test.
    if (entity.path !== undefined) record['lineage:path'] = entity.path;
    if (entity.locator?.uri) record['prov:location'] = entity.locator.uri;
    if (entity.digest) {
      record['lineage:digestAlgorithm'] = entity.digest.algorithm;
      record['lineage:digestValue'] = entity.digest.value;
    }
    entities[qname(id)] = record;
  }
  if (Object.keys(entities).length > 0) out.entity = entities;

  const activities: Record<string, Record<string, unknown>> = {};
  for (const [id, activity] of Object.entries(doc.activities)) {
    const record: Record<string, unknown> = flattenAttrs(activity.attributes);
    record['prov:type'] = activity.type;
    record['lineage:id'] = id;
    if (activity.name) record['prov:label'] = activity.name;
    if (activity.startedAt) record['prov:startTime'] = activity.startedAt;
    if (activity.endedAt) record['prov:endTime'] = activity.endedAt;
    activities[qname(id)] = record;
  }
  if (Object.keys(activities).length > 0) out.activity = activities;

  const agents: Record<string, Record<string, unknown>> = {};
  for (const [id, agent] of Object.entries(doc.agents)) {
    const record: Record<string, unknown> = flattenAttrs(agent.attributes);
    record['lineage:id'] = id;
    if (agent.type) record['prov:type'] = agent.type;
    if (agent.name) record['prov:label'] = agent.name;
    agents[qname(id)] = record;
  }
  if (Object.keys(agents).length > 0) out.agent = agents;

  const wasDerivedFrom: Record<string, Record<string, unknown>> = {};
  const wasGeneratedBy: Record<string, Record<string, unknown>> = {};
  const used: Record<string, Record<string, unknown>> = {};
  const wasAssociatedWith: Record<string, Record<string, unknown>> = {};
  const wasAttributedTo: Record<string, Record<string, unknown>> = {};
  const hadMember: Record<string, Record<string, unknown>> = {};
  const specializationOf: Record<string, Record<string, unknown>> = {};
  const alternateOf: Record<string, Record<string, unknown>> = {};

  for (const derivation of doc.derivations) {
    const id = derivationId(derivation);
    const genId = qname(`gen:${id}`);
    wasGeneratedBy[genId] = {
      'prov:entity': qname(derivation.output),
      'prov:activity': qname(derivation.activity),
    };

    for (let i = 0; i < derivation.inputs.length; i++) {
      const input = derivation.inputs[i]!;
      const derId = qname(`wdf:${id}:${i}`);
      wasDerivedFrom[derId] = {
        'prov:generatedEntity': qname(derivation.output),
        'prov:usedEntity': qname(input.entity),
        'prov:activity': qname(derivation.activity),
        ...(input.role ? { 'prov:role': input.role } : {}),
        'lineage:effect': input.effect,
      };

      const usedId = qname(`used:${id}:${i}`);
      used[usedId] = {
        'prov:activity': qname(derivation.activity),
        'prov:entity': qname(input.entity),
        ...(input.role ? { 'prov:role': input.role } : {}),
      };
    }
  }

  for (const [activityId, activity] of Object.entries(doc.activities)) {
    for (let i = 0; i < (activity.associations?.length ?? 0); i++) {
      const association = activity.associations![i]!;
      wasAssociatedWith[qname(`assoc:${activityId}:${i}`)] = {
        'prov:activity': qname(activityId),
        'prov:agent': qname(association.agent),
        ...(association.role ? { 'prov:role': association.role } : {}),
      };
    }
  }

  for (const [entityId, entity] of Object.entries(doc.entities)) {
    for (let i = 0; i < (entity.attributions?.length ?? 0); i++) {
      const attribution = entity.attributions![i]!;
      wasAttributedTo[qname(`attr:${entityId}:${i}`)] = {
        'prov:entity': qname(entityId),
        'prov:agent': qname(attribution.agent),
        ...(attribution.role ? { 'prov:role': attribution.role } : {}),
      };
    }
  }

  for (let i = 0; i < (doc.relations?.length ?? 0); i++) {
    const relation = doc.relations![i]!;
    if (relation.type === 'member_of') {
      // PROV hadMember: collection → member (inverse of our member_of direction)
      hadMember[qname(`mem:${i}`)] = {
        'prov:collection': qname(relation.target),
        'prov:entity': qname(relation.source),
      };
    } else if (relation.type === 'specialization_of') {
      specializationOf[qname(`spec:${i}`)] = {
        'prov:specificEntity': qname(relation.source),
        'prov:generalEntity': qname(relation.target),
      };
    } else if (relation.type === 'alternate_of') {
      alternateOf[qname(`alt:${i}`)] = {
        'prov:alternate1': qname(relation.source),
        'prov:alternate2': qname(relation.target),
      };
    }
  }

  if (Object.keys(wasDerivedFrom).length > 0) out.wasDerivedFrom = wasDerivedFrom;
  if (Object.keys(wasGeneratedBy).length > 0) out.wasGeneratedBy = wasGeneratedBy;
  if (Object.keys(used).length > 0) out.used = used;
  if (Object.keys(wasAssociatedWith).length > 0) out.wasAssociatedWith = wasAssociatedWith;
  if (Object.keys(wasAttributedTo).length > 0) out.wasAttributedTo = wasAttributedTo;
  if (Object.keys(hadMember).length > 0) out.hadMember = hadMember;
  if (Object.keys(specializationOf).length > 0) out.specializationOf = specializationOf;
  if (Object.keys(alternateOf).length > 0) out.alternateOf = alternateOf;

  return out;
}

/**
 * Attributes render alongside canonical PROV keys, so callers write them first
 * and let the canonical keys land last: an attribute named `prov:type` then
 * loses to the real kind instead of falsifying it.
 *
 * Prefixes this document does not declare are folded into `lineage:attribute:*`
 * rather than emitted as undeclared QNames, which loses the profile namespace.
 */
function flattenAttrs(attrs: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs ?? {})) {
    out[key.startsWith('prov:') || key.startsWith('lineage:') ? key : qname(`attribute:${key}`)] =
      value;
  }
  return out;
}
