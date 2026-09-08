/**
 * Public `@openparser/extract` surface for runtime-neutral grounded extraction.
 *
 * Owns the grounded extraction algorithm (prompts, schema prep, repair loop,
 * validation, unwrap, citations) plus lineage production. Hosted provider
 * clients, queues, and env reads stay in the consuming host.
 */

export {
  EXTRACT_PROMPT,
  GROUNDED_EXTRACT_PROMPT,
  appendExtractionCallerPrompt,
  composeExtractionInstruction,
  composeExtractionUserMessage,
  formatExtractionRepairFeedback,
} from './prompts';
export {
  ExtractionSchemaFailure,
  MAX_EXTRACTION_REPAIR_ATTEMPTS,
  isGroundedExtractionSchemaSupported,
  runGroundedExtraction,
  structuredExtractionFailureFromUnknown,
  type CompleteStructuredExtraction,
  type ExtractionAttemptKind,
  type ExtractionAttemptOutcome,
  type ExtractionAttemptStatus,
  type ExtractionRepairError,
  type ExtractionRepairFeedback,
  type ExtractionRunHooks,
  type ExtractionValidationResult,
  type GroundedExtractionInput,
  type GroundedExtractionResult,
  type StructuredExtractionCompletion,
  type StructuredExtractionFailure,
  type StructuredExtractionRequest,
} from './run';

export {
  EXTRACTION_CITATION_GRANULARITIES,
  EXTRACTION_GROUNDING_MODES,
  ExtractionCitationGranularitySchema,
  ExtractionCitationSchema,
  ExtractionGroundingFieldSchema,
  ExtractionGroundingModeSchema,
  ExtractionGroundingResultSchema,
  ExtractionTransformClaimSchema,
  TRANSFORM_CLAIM_OPERATIONS,
  TRANSFORM_CONFIDENCE_LEVELS,
  TransformClaimOperationSchema,
  TransformConfidenceLevelSchema,
  type ExtractionCitation,
  type ExtractionCitationGranularity,
  type ExtractionGroundingField,
  type ExtractionGroundingMode,
  type ExtractionGroundingResult,
  type ExtractionTransformClaim,
  type TransformClaimOperation,
  type TransformConfidenceLevel,
} from './grounding';

export {
  ExtractionReviewEventSchema,
  approversByPointerFromEvents,
  liveCompletionEvent,
  liveFieldConfirmedEvents,
  reviewPathsOverlap,
  type CompletionReviewEvent,
  type ExtractionReviewEvent,
  type FieldConfirmedReviewEvent,
} from './review-events';

export { StrictExtractionSchemaError, normalizeStrictExtractionSchema } from './strict-schema';

export {
  alignFieldToSourceTexts,
  alignValueToSourceText,
  documentPlainText,
  type SourceAlignmentResult,
  type SourceAlignmentStatus,
} from './grounding/alignment-confidence';
export {
  alignExtractionField,
  assessExtractionField,
  citedRegionTexts,
  finalValueAlignment,
  type ExtractionFieldAssessment,
} from './grounding/field-alignment';
export { buildExtractionLineage } from './grounding/lineage';
export { ReviewLineagePathError, appendExtractionReviewLineage } from './grounding/review-lineage';
export {
  GROUNDING_FIELDS_KEY,
  GROUNDING_QUOTE_KEY,
  GROUNDING_REASON_KEY,
  GROUNDING_SOURCE_IDS_KEY,
  GROUNDING_TRANSFORM_CLAIM_KEY,
  GROUNDING_VALUES_KEY,
  GroundingUnsupportedSchemaError,
  OPENPARSER_TRANSFORM_EXTENSION_KEY,
  assertGroundingSchemaSupported,
  compileTransformPlan,
  emptyCompiledTransformPlan,
  providerSafeExtractionSchema,
  relaxGroundingNarrative,
  transformIntentForPointer,
  transformSchemaForGrounding,
  transformSchemaForGroundingLeafWrapped,
  type CompiledTransformPlan,
} from './grounding/schema-transform';
export {
  indexGroundingSources,
  renderGroundedDocument,
  truncateParsedDocumentToCharBudget,
  type GroundingSourceIndex,
  type GroundingTableCellRef,
  type TruncatedParsedDocument,
} from './grounding/sources';
export {
  buildGroundingResult,
  resolveGroundingFields,
  unwrapGroundedOutput,
} from './grounding/unground';
