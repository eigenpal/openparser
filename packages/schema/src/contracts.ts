import { z } from 'zod';
import {
  ExtractionAttemptKindSchema,
  ExtractionAttemptSchema,
  ExtractionAttemptStatusSchema,
  ExtractionTerminalResultSchema,
  ExtractionUsageTotalsSchema,
  LlmModelSchema,
} from './extraction';
import {
  ExtractionCitationGranularitySchema,
  ExtractionCitationSchema,
  ExtractionGroundingFieldSchema,
  ExtractionGroundingModeSchema,
  ExtractionGroundingResultSchema,
} from './grounding';
import { ExtractionPipelineIdInputSchema, JobIdInputSchema } from './id-compat';
import {
  BatchChildPageSchema,
  BatchChildSummarySchema,
  BatchJobAcceptedSchema,
  BatchSummaryCountsSchema,
  ErrorBodySchema,
  ErrorResponseSchema,
  JobAcceptedSchema,
  JobFailureSchema,
  JobHistoryOperationSchema,
  JobIdSchema,
  JobListResponseSchema,
  JobSchema,
  JobStatusSchema,
  JobSummarySchema,
} from './jobs';
import { OcrLlmModelCatalogEntrySchema, OcrLlmModelsResponseSchema } from './llm-models';
import { LlmOptionsRequestSchema, OcrOptionsRequestSchema } from './model-options';
import { OcrModelCatalogEntrySchema, OcrModelsResponseSchema } from './ocr-models';
import {
  BoundingBoxSchema,
  ChunkProvenanceSpanSchema,
  ContentKindSchema,
  ExtractionChunkSchema,
  PageBlockSchema,
  ParsedDocumentSchema,
  RegionContentSchema,
  RegionSchema,
  RegionTypeSchema,
} from './parsed-document';
import {
  CreateExtractionPipelineRequestSchema,
  DeleteExtractionPipelineResponseSchema,
  ExtractionPipelineIdSchema,
  ExtractionPipelineListResponseSchema,
  ExtractionPipelineSchema,
  UpdateExtractionPipelineRequestSchema,
  refineExtractPipelineXor,
} from './pipelines';
import { OcrOutputFormatSchema, PaddleRawProfileSchema, RawParseResultSchema } from './raw-result';
import { SuggestSchemaRequestSchema, SuggestSchemaResponseSchema } from './suggest-schema';

export { OCR_MODELS } from './ocr-models';
/**
 * Request parsing accepts a syntactically valid registry name first so the
 * model registry can return the stable `unsupported_ocr_model` API error.
 */
export const OcrModelSchema = z.string().min(1).max(128);
export type OcrModel = z.infer<typeof OcrModelSchema>;

/** OpenParser reusable file-pool id (`POST /files`). */
export const OcrFileIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, 'file_id must be a valid OpenParser file id');
export type OcrFileId = z.infer<typeof OcrFileIdSchema>;

export const RepairAttemptsSchema = z.number().int().min(0).max(2).default(0);
export const ExtractionJsonSchemaObjectSchema = z.record(z.string(), z.unknown());

export const ParseRequestSchema = z
  .object({
    ocr_model: OcrModelSchema,
    ocr_options: OcrOptionsRequestSchema.optional(),
    file_id: OcrFileIdSchema.optional(),
    output_format: OcrOutputFormatSchema.default('openparser@1'),
  })
  .strict();
export type ParseRequest = z.infer<typeof ParseRequestSchema>;

/**
 * Single extract admission. Strict XOR: either `pipeline_id` **or** full inline
 * config (`ocr_model` + `llm_model` + `schema` + optional repair/grounding/reasoning).
 * Mixing returns Zod issue `pipeline_inline_conflict`.
 */
export const ExtractRequestSchema = z
  .object({
    pipeline_id: ExtractionPipelineIdInputSchema.optional(),
    ocr_model: OcrModelSchema.optional(),
    ocr_options: OcrOptionsRequestSchema.optional(),
    llm_model: LlmModelSchema.optional(),
    llm_options: LlmOptionsRequestSchema.optional(),
    schema: ExtractionJsonSchemaObjectSchema.optional(),
    repair_attempts: z.number().int().min(0).max(2).optional(),
    grounding: ExtractionGroundingModeSchema.optional(),
    file_id: OcrFileIdSchema.optional(),
    parse_job_id: JobIdInputSchema.optional(),
    output_format: OcrOutputFormatSchema.default('openparser@1'),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.file_id !== undefined && value.parse_job_id !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'provide exactly one of file_id or parse_job_id',
        path: ['parse_job_id'],
      });
    }
    if (value.parse_job_id !== undefined) {
      if (value.ocr_model !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'ocr_model is not allowed when parse_job_id is set',
          path: ['ocr_model'],
        });
      }
      if (value.ocr_options !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'ocr_options is not allowed when parse_job_id is set',
          path: ['ocr_options'],
        });
      }
    }
    refineExtractPipelineXor(value, ctx, { requireOcrModel: value.parse_job_id === undefined });
  })
  .transform((value) => {
    const source = {
      file_id: value.file_id,
      parse_job_id: value.parse_job_id,
      output_format: value.output_format,
    };
    if (value.pipeline_id !== undefined) return { pipeline_id: value.pipeline_id, ...source };
    return {
      ...(value.ocr_model !== undefined ? { ocr_model: value.ocr_model } : {}),
      ...(value.ocr_options !== undefined ? { ocr_options: value.ocr_options } : {}),
      llm_model: value.llm_model!,
      ...(value.llm_options !== undefined ? { llm_options: value.llm_options } : {}),
      schema: value.schema!,
      repair_attempts: value.repair_attempts ?? 0,
      grounding: value.grounding ?? ('none' as const),
      ...source,
    };
  });
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;
export type ExtractInlineRequest = Extract<ExtractRequest, { llm_model: string }>;
export type ExtractPipelineRequest = Extract<ExtractRequest, { pipeline_id: string }>;

export {
  SUGGEST_SCHEMA_HINT_MAX_CHARS,
  SUGGEST_SCHEMA_PREVIEW_MAX_CHARS,
  SUGGEST_SCHEMA_PREVIEW_MAX_PAGES,
  SuggestSchemaHintSchema,
  SuggestSchemaPreviewMetaSchema,
  SuggestSchemaRequestSchema,
  SuggestSchemaResponseSchema,
  SuggestSchemaTerminalResultSchema,
  type SuggestSchemaHint,
  type SuggestSchemaPreviewMeta,
  type SuggestSchemaRequest,
  type SuggestSchemaResponse,
  type SuggestSchemaTerminalResult,
} from './suggest-schema';

export {
  CreateExtractionPipelineRequestSchema,
  DeleteExtractionPipelineResponseSchema,
  EXTRACT_INLINE_CONFIG_KEYS,
  ExtractionPipelineIdSchema,
  ExtractionPipelineListResponseSchema,
  ExtractionPipelineNameSchema,
  ExtractionPipelineSchema,
  ExtractionPipelineSlugSchema,
  PipelineExtractionSchemaObjectSchema,
  UpdateExtractionPipelineRequestSchema,
  refineExtractPipelineXor,
  type CreateExtractionPipelineRequest,
  type DeleteExtractionPipelineResponse,
  type ExtractionPipeline,
  type ExtractionPipelineId,
  type ExtractionPipelineListResponse,
  type ExtractionPipelineName,
  type ExtractionPipelineSlug,
  type UpdateExtractionPipelineRequest,
} from './pipelines';

export {
  PIPELINE_EXTRACTION_SCHEMA_EMPTY_PROPERTIES_MESSAGE,
  hasPipelineExtractionSchemaProperties,
  pipelineExtractionSchemaRootPropertyCount,
  refinePipelineExtractionSchema,
} from './pipeline-extraction-schema';

function requireExactlyOneSource(
  item: { file_index?: number; file_id?: string },
  ctx: z.RefinementCtx
): void {
  const hasIndex = item.file_index !== undefined;
  const hasFileId = item.file_id !== undefined;
  if (hasIndex === hasFileId) {
    ctx.addIssue({
      code: 'custom',
      message: 'each batch item requires exactly one of file_index or file_id',
      path: hasIndex ? ['file_id'] : ['file_index'],
    });
  }
}

export const ParseBatchItemSchema = z
  .object({
    client_item_id: z.string().min(1).max(128),
    file_index: z.number().int().min(0).optional(),
    file_id: OcrFileIdSchema.optional(),
    ocr_model: OcrModelSchema,
    ocr_options: OcrOptionsRequestSchema.optional(),
  })
  .strict()
  .superRefine(requireExactlyOneSource);
export type ParseBatchItem = z.infer<typeof ParseBatchItemSchema>;

export const ExtractBatchItemSchema = z
  .object({
    client_item_id: z.string().min(1).max(128),
    file_index: z.number().int().min(0).optional(),
    file_id: OcrFileIdSchema.optional(),
    pipeline_id: ExtractionPipelineIdInputSchema.optional(),
    ocr_model: OcrModelSchema.optional(),
    ocr_options: OcrOptionsRequestSchema.optional(),
    llm_model: LlmModelSchema.optional(),
    llm_options: LlmOptionsRequestSchema.optional(),
    schema: ExtractionJsonSchemaObjectSchema.optional(),
    repair_attempts: z.number().int().min(0).max(2).optional(),
    grounding: ExtractionGroundingModeSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    requireExactlyOneSource(value, ctx);
    refineExtractPipelineXor(value, ctx);
  })
  .transform((value) => {
    const base = {
      client_item_id: value.client_item_id,
      file_index: value.file_index,
      file_id: value.file_id,
    };
    if (value.pipeline_id !== undefined) {
      return { ...base, pipeline_id: value.pipeline_id };
    }
    return {
      ...base,
      ocr_model: value.ocr_model!,
      ...(value.ocr_options !== undefined ? { ocr_options: value.ocr_options } : {}),
      llm_model: value.llm_model!,
      ...(value.llm_options !== undefined ? { llm_options: value.llm_options } : {}),
      schema: value.schema!,
      repair_attempts: value.repair_attempts ?? 0,
      grounding: value.grounding ?? ('none' as const),
    };
  });
export type ExtractBatchItem = z.infer<typeof ExtractBatchItemSchema>;

export const ParseBatchRequestSchema = z
  .object({
    items: z.array(ParseBatchItemSchema).min(1).max(100),
    output_format: OcrOutputFormatSchema.default('openparser@1'),
  })
  .strict();
export type ParseBatchRequest = z.infer<typeof ParseBatchRequestSchema>;

export const ExtractBatchRequestSchema = z
  .object({
    items: z.array(ExtractBatchItemSchema).min(1).max(100),
    output_format: OcrOutputFormatSchema.default('openparser@1'),
  })
  .strict();
export type ExtractBatchRequest = z.infer<typeof ExtractBatchRequestSchema>;

export const PublicFileSchema = z
  .object({
    id: z.string(),
    filename: z.string(),
    contentType: z.string().nullable(),
    size: z.number().int().min(0).nullable(),
    purpose: z.null(),
    createdAt: z.string().datetime(),
  })
  .strict();
export type PublicFile = z.infer<typeof PublicFileSchema>;

export const DeleteFileResponseSchema = z.object({ deleted: z.literal(true) }).strict();
export type DeleteFileResponse = z.infer<typeof DeleteFileResponseSchema>;

export const OpenParserParseResultSchema = z.union([ParsedDocumentSchema, RawParseResultSchema]);
export type OpenParserParseResult = z.infer<typeof OpenParserParseResultSchema>;

export const OPENPARSER_COMPONENT_SCHEMAS = {
  PublicFile: PublicFileSchema,
  JobId: JobIdSchema,
  OcrModel: OcrModelSchema,
  LlmModel: LlmModelSchema,
  RepairAttempts: RepairAttemptsSchema,
  JsonSchemaObject: ExtractionJsonSchemaObjectSchema,
  FileId: OcrFileIdSchema,
  ParseRequest: ParseRequestSchema,
  ExtractRequest: ExtractRequestSchema,
  SuggestSchemaRequest: SuggestSchemaRequestSchema,
  CreateExtractionPipelineRequest: CreateExtractionPipelineRequestSchema,
  UpdateExtractionPipelineRequest: UpdateExtractionPipelineRequestSchema,
  ExtractionPipeline: ExtractionPipelineSchema,
  ExtractionPipelineListResponse: ExtractionPipelineListResponseSchema,
  DeleteExtractionPipelineResponse: DeleteExtractionPipelineResponseSchema,
  ExtractionPipelineId: ExtractionPipelineIdSchema,
  ParseBatchItem: ParseBatchItemSchema,
  ExtractBatchItem: ExtractBatchItemSchema,
  ParseBatchRequest: ParseBatchRequestSchema,
  ExtractBatchRequest: ExtractBatchRequestSchema,
  OcrOutputFormat: OcrOutputFormatSchema,
  PaddleRawProfile: PaddleRawProfileSchema,
  RawParseResult: RawParseResultSchema,
  ParseResult: OpenParserParseResultSchema,
  JobStatus: JobStatusSchema,
  JobOperation: JobHistoryOperationSchema,
  JobAccepted: JobAcceptedSchema,
  BatchJobAccepted: BatchJobAcceptedSchema,
  BoundingBox: BoundingBoxSchema,
  PageBlock: PageBlockSchema,
  RegionType: RegionTypeSchema,
  Region: RegionSchema,
  ContentKind: ContentKindSchema,
  RegionContent: RegionContentSchema,
  ChunkProvenanceSpan: ChunkProvenanceSpanSchema,
  ExtractionChunk: ExtractionChunkSchema,
  ParsedDocument: ParsedDocumentSchema,
  ExtractionAttemptKind: ExtractionAttemptKindSchema,
  ExtractionAttemptStatus: ExtractionAttemptStatusSchema,
  ExtractionAttempt: ExtractionAttemptSchema,
  ExtractionUsageTotals: ExtractionUsageTotalsSchema,
  ExtractionGroundingMode: ExtractionGroundingModeSchema,
  ExtractionCitationGranularity: ExtractionCitationGranularitySchema,
  ExtractionCitation: ExtractionCitationSchema,
  ExtractionGroundingField: ExtractionGroundingFieldSchema,
  ExtractionGroundingResult: ExtractionGroundingResultSchema,
  ExtractionTerminalResult: ExtractionTerminalResultSchema,
  SuggestSchemaResponse: SuggestSchemaResponseSchema,
  JobFailure: JobFailureSchema,
  BatchChildSummary: BatchChildSummarySchema,
  BatchChildPage: BatchChildPageSchema,
  BatchSummaryCounts: BatchSummaryCountsSchema,
  Job: JobSchema.extend({
    operation: JobHistoryOperationSchema,
    result: z
      .union([ParsedDocumentSchema, RawParseResultSchema, ExtractionTerminalResultSchema])
      .optional(),
  }),
  JobSummary: JobSummarySchema,
  JobListResponse: JobListResponseSchema,
  ErrorBody: ErrorBodySchema,
  ErrorResponse: ErrorResponseSchema,
  DeleteFileResponse: DeleteFileResponseSchema,
  OcrModelCatalogEntry: OcrModelCatalogEntrySchema,
  OcrModelsResponse: OcrModelsResponseSchema,
  OcrLlmModelCatalogEntry: OcrLlmModelCatalogEntrySchema,
  OcrLlmModelsResponse: OcrLlmModelsResponseSchema,
} as const satisfies Record<string, z.ZodType>;

export type OpenParserComponentSchemaName = keyof typeof OPENPARSER_COMPONENT_SCHEMAS;

type ResponseTarget =
  | { schema: OpenParserComponentSchemaName }
  | { binary: true }
  | {
      component:
        | 'JobAccepted'
        | 'BatchJobAccepted'
        | 'MalformedRequest'
        | 'Unauthorized'
        | 'Forbidden'
        | 'FileNotFound'
        | 'PipelineNotFound'
        | 'InsufficientCredits'
        | 'IdempotencyConflict'
        | 'PipelineNameConflict'
        | 'JobNotTerminal'
        | 'ParseResultUnavailable'
        | 'LimitExceeded'
        | 'UnsupportedMediaType'
        | 'UnprocessableConfig'
        | 'UnprocessableOrSyncFailed'
        | 'SyncTerminalIndeterminate'
        | 'RateLimited'
        | 'ServiceUnavailable'
        | 'JobNotFound'
        | 'JobSourceUnavailable'
        | 'PartialContent'
        | 'RangeNotSatisfiable';
    };

type OpenParserRouteDefinition = {
  operationId: string;
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
  tag: 'parse' | 'extract' | 'jobs' | 'files' | 'models' | 'pipelines';
  requestBody?:
    | 'ParseSingleUpload'
    | 'ExtractSingleUpload'
    | 'SuggestSchemaRequest'
    | 'CreateExtractionPipelineRequest'
    | 'UpdateExtractionPipelineRequest'
    | 'ParseBatchUpload'
    | 'ExtractBatchUpload'
    | 'CreateFileUpload';
  parameters?: readonly (
    | 'IdempotencyKey'
    | 'JobId'
    | 'FileId'
    | 'PipelineId'
    | 'ChildCursor'
    | 'ChildLimit'
    | 'JobListCursor'
    | 'JobListLimit'
    | 'JobListStatus'
    | 'JobListOperation'
    | 'ParseResultFormat'
    | 'LlmModelsMode'
    | 'LlmModelsQuery'
    | 'LlmModelsPage'
    | 'LlmModelsLimit'
  )[];
  responses: Readonly<Record<number, ResponseTarget>>;
};

const admissionErrors = {
  400: { component: 'MalformedRequest' },
  401: { component: 'Unauthorized' },
  402: { component: 'InsufficientCredits' },
  403: { component: 'Forbidden' },
  409: { component: 'IdempotencyConflict' },
  413: { component: 'LimitExceeded' },
  415: { component: 'UnsupportedMediaType' },
  429: { component: 'RateLimited' },
  503: { component: 'ServiceUnavailable' },
} as const;

/** Runtime and OpenAPI source of truth for the public OpenParser HTTP surface. */
export const OPENPARSER_ROUTE_MANIFEST = [
  {
    operationId: 'listOcrModels',
    method: 'get',
    path: '/models/ocr',
    tag: 'models',
    responses: {
      200: { schema: 'OcrModelsResponse' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      429: { component: 'RateLimited' },
    },
  },
  {
    operationId: 'listLlmModels',
    method: 'get',
    path: '/models/llm',
    tag: 'models',
    parameters: ['LlmModelsMode', 'LlmModelsQuery', 'LlmModelsPage', 'LlmModelsLimit'],
    responses: {
      200: { schema: 'OcrLlmModelsResponse' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      429: { component: 'RateLimited' },
    },
  },
  {
    operationId: 'parseSync',
    method: 'post',
    path: '/parse',
    tag: 'parse',
    requestBody: 'ParseSingleUpload',
    parameters: ['IdempotencyKey'],
    responses: {
      200: { schema: 'ParseResult' },
      202: { component: 'JobAccepted' },
      ...admissionErrors,
      422: { component: 'UnprocessableOrSyncFailed' },
      504: { component: 'SyncTerminalIndeterminate' },
    },
  },
  {
    operationId: 'parseAsync',
    method: 'post',
    path: '/parse/async',
    tag: 'parse',
    requestBody: 'ParseSingleUpload',
    parameters: ['IdempotencyKey'],
    responses: {
      202: { component: 'JobAccepted' },
      ...admissionErrors,
      422: { component: 'UnprocessableConfig' },
    },
  },
  {
    operationId: 'parseBatch',
    method: 'post',
    path: '/parse/batch',
    tag: 'parse',
    requestBody: 'ParseBatchUpload',
    parameters: ['IdempotencyKey'],
    responses: {
      202: { component: 'BatchJobAccepted' },
      ...admissionErrors,
      422: { component: 'UnprocessableConfig' },
    },
  },
  {
    operationId: 'extractSync',
    method: 'post',
    path: '/extract',
    tag: 'extract',
    requestBody: 'ExtractSingleUpload',
    parameters: ['IdempotencyKey'],
    responses: {
      200: { schema: 'ExtractionTerminalResult' },
      202: { component: 'JobAccepted' },
      ...admissionErrors,
      422: { component: 'UnprocessableOrSyncFailed' },
      504: { component: 'SyncTerminalIndeterminate' },
    },
  },
  {
    operationId: 'extractAsync',
    method: 'post',
    path: '/extract/async',
    tag: 'extract',
    requestBody: 'ExtractSingleUpload',
    parameters: ['IdempotencyKey'],
    responses: {
      202: { component: 'JobAccepted' },
      ...admissionErrors,
      422: { component: 'UnprocessableConfig' },
    },
  },
  {
    operationId: 'extractBatch',
    method: 'post',
    path: '/extract/batch',
    tag: 'extract',
    requestBody: 'ExtractBatchUpload',
    parameters: ['IdempotencyKey'],
    responses: {
      202: { component: 'BatchJobAccepted' },
      ...admissionErrors,
      422: { component: 'UnprocessableConfig' },
    },
  },
  {
    operationId: 'suggestSchema',
    method: 'post',
    path: '/suggest-schema',
    tag: 'extract',
    requestBody: 'SuggestSchemaRequest',
    responses: {
      200: { schema: 'SuggestSchemaResponse' },
      400: { component: 'MalformedRequest' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      404: { component: 'JobNotFound' },
      422: { component: 'UnprocessableOrSyncFailed' },
      429: { component: 'RateLimited' },
      503: { component: 'ServiceUnavailable' },
      504: { component: 'SyncTerminalIndeterminate' },
    },
  },
  {
    operationId: 'listJobs',
    method: 'get',
    path: '/jobs',
    tag: 'jobs',
    parameters: ['JobListCursor', 'JobListLimit', 'JobListStatus', 'JobListOperation'],
    responses: {
      200: { schema: 'JobListResponse' },
      400: { component: 'MalformedRequest' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      429: { component: 'RateLimited' },
    },
  },
  {
    operationId: 'getJob',
    method: 'get',
    path: '/jobs/{id}',
    tag: 'jobs',
    parameters: ['JobId', 'ChildCursor', 'ChildLimit'],
    responses: {
      200: { schema: 'Job' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      404: { component: 'JobNotFound' },
      429: { component: 'RateLimited' },
    },
  },
  {
    operationId: 'getJobResult',
    method: 'get',
    path: '/jobs/{id}/result',
    tag: 'jobs',
    parameters: ['JobId', 'ParseResultFormat'],
    responses: {
      200: { schema: 'ParseResult' },
      400: { component: 'MalformedRequest' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      404: { component: 'JobNotFound' },
      409: { component: 'JobNotTerminal' },
      422: { component: 'ParseResultUnavailable' },
      429: { component: 'RateLimited' },
      504: { component: 'SyncTerminalIndeterminate' },
    },
  },
  {
    operationId: 'getJobSource',
    method: 'get',
    path: '/jobs/{id}/source',
    tag: 'jobs',
    parameters: ['JobId'],
    responses: {
      200: { binary: true },
      206: { component: 'PartialContent' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      404: { component: 'JobSourceUnavailable' },
      416: { component: 'RangeNotSatisfiable' },
      429: { component: 'RateLimited' },
    },
  },
  {
    operationId: 'createFile',
    method: 'post',
    path: '/files',
    tag: 'files',
    requestBody: 'CreateFileUpload',
    responses: {
      200: { schema: 'PublicFile' },
      400: { component: 'MalformedRequest' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      413: { component: 'LimitExceeded' },
      415: { component: 'UnsupportedMediaType' },
      429: { component: 'RateLimited' },
    },
  },
  {
    operationId: 'getFile',
    method: 'get',
    path: '/files/{id}',
    tag: 'files',
    parameters: ['FileId'],
    responses: {
      200: { schema: 'PublicFile' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      404: { component: 'FileNotFound' },
      429: { component: 'RateLimited' },
    },
  },
  {
    operationId: 'deleteFile',
    method: 'delete',
    path: '/files/{id}',
    tag: 'files',
    parameters: ['FileId'],
    responses: {
      200: { schema: 'DeleteFileResponse' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      404: { component: 'FileNotFound' },
      429: { component: 'RateLimited' },
    },
  },
  {
    operationId: 'getFileContent',
    method: 'get',
    path: '/files/{id}/content',
    tag: 'files',
    parameters: ['FileId'],
    responses: {
      200: { binary: true },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      404: { component: 'FileNotFound' },
      429: { component: 'RateLimited' },
    },
  },
  {
    operationId: 'createExtractionPipeline',
    method: 'post',
    path: '/pipelines',
    tag: 'pipelines',
    requestBody: 'CreateExtractionPipelineRequest',
    responses: {
      200: { schema: 'ExtractionPipeline' },
      400: { component: 'MalformedRequest' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      409: { component: 'PipelineNameConflict' },
      422: { component: 'UnprocessableConfig' },
      429: { component: 'RateLimited' },
    },
  },
  {
    operationId: 'listExtractionPipelines',
    method: 'get',
    path: '/pipelines',
    tag: 'pipelines',
    responses: {
      200: { schema: 'ExtractionPipelineListResponse' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      429: { component: 'RateLimited' },
    },
  },
  {
    operationId: 'getExtractionPipeline',
    method: 'get',
    path: '/pipelines/{id}',
    tag: 'pipelines',
    parameters: ['PipelineId'],
    responses: {
      200: { schema: 'ExtractionPipeline' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      404: { component: 'PipelineNotFound' },
      429: { component: 'RateLimited' },
    },
  },
  {
    operationId: 'updateExtractionPipeline',
    method: 'patch',
    path: '/pipelines/{id}',
    tag: 'pipelines',
    parameters: ['PipelineId'],
    requestBody: 'UpdateExtractionPipelineRequest',
    responses: {
      200: { schema: 'ExtractionPipeline' },
      400: { component: 'MalformedRequest' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      404: { component: 'PipelineNotFound' },
      409: { component: 'PipelineNameConflict' },
      422: { component: 'UnprocessableConfig' },
      429: { component: 'RateLimited' },
    },
  },
  {
    operationId: 'deleteExtractionPipeline',
    method: 'delete',
    path: '/pipelines/{id}',
    tag: 'pipelines',
    parameters: ['PipelineId'],
    responses: {
      200: { schema: 'DeleteExtractionPipelineResponse' },
      401: { component: 'Unauthorized' },
      403: { component: 'Forbidden' },
      404: { component: 'PipelineNotFound' },
      429: { component: 'RateLimited' },
    },
  },
] as const satisfies readonly OpenParserRouteDefinition[];

export type OpenParserRoute = (typeof OPENPARSER_ROUTE_MANIFEST)[number];
export type OpenParserOperationId = OpenParserRoute['operationId'];

export function getOpenParserRoute(method: string, path: string): OpenParserRoute | undefined {
  const normalizedMethod = method.toLowerCase();
  return OPENPARSER_ROUTE_MANIFEST.find((route) => {
    if (route.method !== normalizedMethod) return false;
    const pattern = route.path.replace(/\{[^/]+\}/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(path);
  });
}
