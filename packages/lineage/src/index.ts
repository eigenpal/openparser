/**
 * Public `@openparser/lineage` surface for `lineage@1` complete data-derivation DAGs.
 *
 * Provider- and domain-agnostic provenance documents grounded in W3C PROV-DM
 * semantics with ergonomic JSON. Root export only — no subpath exports.
 */

export {
  ACTIVITY_STATUSES,
  ActivitySchema,
  ActivityStatusSchema,
  AgentSchema,
  AssociationSchema,
  ImplementationSchema,
  type Activity,
  type ActivityStatus,
  type Agent,
  type Association,
  type Implementation,
} from './activity';

export { ApprovalAssertionSchema, type ApprovalAssertion } from './approval';

export { LineageBuilder } from './builder';

export {
  AttributesSchema,
  JsonPointerSchema,
  JsonValueSchema,
  LINEAGE_FORMAT,
  LineageFormatSchema,
  LineageIdSchema,
  TimestampSchema,
  jsonValuesEqual,
  type Attributes,
  type JsonPointer,
  type JsonValue,
  type LineageFormat,
  type LineageId,
  type Timestamp,
} from './common';

export {
  CONFIDENCE_KINDS,
  ConfidenceAssertionSchema,
  ConfidenceKindSchema,
  ConfidenceScaleSchema,
  ConfidenceSourceSchema,
  type ConfidenceAssertion,
  type ConfidenceKind,
  type ConfidenceScale,
  type ConfidenceSource,
} from './confidence';

export {
  DERIVATION_EFFECTS,
  DerivationEffectSchema,
  DerivationInputSchema,
  DerivationSchema,
  MAX_DERIVATION_INPUTS,
  TransformationSchema,
  derivationId,
  type Derivation,
  type DerivationEffect,
  type DerivationInput,
  type Transformation,
} from './derivation';

export {
  LineageDocumentSchema,
  LineageDocumentShapeSchema,
  parseLineageDocument,
  safeParseLineageDocument,
  type LineageDocument,
} from './document';

export {
  AttributionSchema,
  DigestSchema,
  ENTITY_KINDS,
  EntityKindSchema,
  EntitySchema,
  LocatorSchema,
  SelectorSchema,
  type Attribution,
  type Digest,
  type Entity,
  type EntityKind,
  type Locator,
  type Selector,
} from './entity';

export {
  LINEAGE_PROV_NAMESPACE,
  lineageIdToProvQualifiedName,
  toProvJson,
  type ProvJsonDocument,
} from './prov';

export {
  RELATION_TYPES,
  RelationSchema,
  RelationTypeSchema,
  type Relation,
  type RelationType,
} from './relation';

export {
  decodeDottedPathSegment,
  dottedPathFromPointer,
  encodeDottedPathSegment,
  parseDottedPathSegments,
  pointerFromDottedPath,
} from './dotted-path';

export {
  fieldEntityByPointer,
  fieldTrace,
  fields,
  type ConfidenceOrigin,
  type LineageField,
  type LineageFieldTrace,
} from './fields';

export { activityLabel } from './labels';

export { entityAncestors, entityDescendants, topologicalEntityOrder } from './traverse';

export { LineageValidationError, validateLineageGraph } from './validate';
