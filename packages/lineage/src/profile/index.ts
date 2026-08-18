/**
 * The OpenParser profile of `lineage@1`, published as `@openparser/lineage/openparser`.
 *
 * `lineage@1` is a vendor-neutral record of where values came from. Anything that
 * depends on how OpenParser in particular scores an OCR word, or on an
 * `openparser:` attribute, lives here — so the protocol surface stays readable as
 * a protocol, and a producer that is not OpenParser is never asked to adopt our
 * conventions to use it.
 */

export { activityLabel } from './labels';

export {
  droppedSourceIds,
  fieldGrounding,
  groundingStatus,
  type FieldGrounding,
  type GroundingStatus,
} from './grounding';

export {
  CITED_RECOGNITION_METHOD,
  CONTEXT_BLEND_WEIGHT,
  REGION_RECOGNITION_METHOD,
  aggregateCitedWordConfidences,
  annotateWordsWithCitation,
  citedSpanInText,
  downwardBlendCitedMinimum,
  type CitedWordAggregate,
  type ScoredWord,
} from './recognition';

export {
  DATE_SOURCE_CATALOG_ID,
  DATE_SOURCE_CATALOG_V1,
  DATE_SOURCE_CATALOG_VERSION,
  FORMAT_ONLY_DATE_TARGETS,
  MAX_TRANSFORM_INTENT_PARAMETER_BYTES,
  MAX_TRANSFORM_PROOF_BYTES,
  TRANSFORM_DOCS_ANCHORS,
  TRANSFORM_OPERATIONS,
  TRANSFORM_PROOF_ATTRIBUTE,
  TRANSFORM_PROOF_OPERAND_KEYS,
  TRANSFORM_VALIDATORS,
  TRANSFORM_VERIFICATION_DOCS,
  TransformClaimSchema,
  TransformIntentSchema,
  TransformProofClassSchema,
  TransformProofSchema,
  dateTimeFormatIssue,
  formatOnlyDateTimeParameters,
  isTrustedTransformDocsHref,
  parseTransformProof,
  transformValidatorDescriptor,
  trustedDateSourceFormats,
  trustedIntentParametersFitProof,
  trustedTransformDocsHref,
  verifyTransform,
  type DateTimeKind,
  type TransformClaim,
  type TransformIntent,
  type TransformOperation,
  type TransformProof,
  type TransformProofClass,
  type TransformValidatorDescriptor,
  type TransformVerificationResult,
} from './transform-validation';
