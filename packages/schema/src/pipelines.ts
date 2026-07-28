import { z } from 'zod';
import { LlmModelSchema } from './extraction';
import { ExtractionGroundingModeSchema } from './grounding';
import {
  LlmOptionsRequestSchema,
  LlmOptionsStoredSchema,
  OcrOptionsEffectiveSchema,
  OcrOptionsRequestSchema,
} from './model-options';
import { refinePipelineExtractionSchema } from './pipeline-extraction-schema';

/**
 * Tenant-scoped saved extraction pipelines for the OpenParser public OCR API.
 * Distinct from workflow / automation authoring surfaces.
 */

/**
 * Preferred public pipeline id (`oppl_…`). Response / OpenAPI stay strict.
 * Request ingress may accept legacy `oep_…` via `ExtractionPipelineIdInputSchema`
 * during the 0046 expand window — see `id-compat.ts`.
 */
export const ExtractionPipelineIdSchema = z
  .string()
  .regex(/^oppl_[A-Za-z0-9_-]+$/, 'pipeline_id must be an oppl_… id')
  .max(128);
export type ExtractionPipelineId = z.infer<typeof ExtractionPipelineIdSchema>;

export const ExtractionPipelineNameSchema = z.string().trim().min(1).max(128);
export type ExtractionPipelineName = z.infer<typeof ExtractionPipelineNameSchema>;

export const ExtractionPipelineSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, 'slug must be lowercase alphanumeric with _ or -');
export type ExtractionPipelineSlug = z.infer<typeof ExtractionPipelineSlugSchema>;

export const PipelineExtractionSchemaObjectSchema = z
  .record(z.string(), z.unknown())
  .superRefine((schema, ctx) => refinePipelineExtractionSchema(schema, ctx));

const PipelineConfigFields = {
  ocr_model: z.string().min(1).max(128),
  ocr_options: OcrOptionsRequestSchema.optional(),
  llm_model: LlmModelSchema,
  llm_options: LlmOptionsRequestSchema.optional(),
  schema: PipelineExtractionSchemaObjectSchema,
  repair_attempts: z.number().int().min(0).max(2).optional(),
  grounding: ExtractionGroundingModeSchema.optional(),
} as const;

export const CreateExtractionPipelineRequestSchema = z
  .object({
    name: ExtractionPipelineNameSchema,
    slug: ExtractionPipelineSlugSchema.optional(),
    ...PipelineConfigFields,
  })
  .strict();
export type CreateExtractionPipelineRequest = z.infer<typeof CreateExtractionPipelineRequestSchema>;

export const UpdateExtractionPipelineRequestSchema = z
  .object({
    name: ExtractionPipelineNameSchema.optional(),
    slug: ExtractionPipelineSlugSchema.nullable().optional(),
    ocr_model: PipelineConfigFields.ocr_model.optional(),
    ocr_options: OcrOptionsRequestSchema.nullable().optional(),
    llm_model: PipelineConfigFields.llm_model.optional(),
    llm_options: LlmOptionsRequestSchema.nullable().optional(),
    schema: PipelineExtractionSchemaObjectSchema.optional(),
    repair_attempts: z.number().int().min(0).max(2).optional(),
    grounding: ExtractionGroundingModeSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'at least one field is required',
      });
    }
  });
export type UpdateExtractionPipelineRequest = z.infer<typeof UpdateExtractionPipelineRequestSchema>;

export const ExtractionPipelineSchema = z
  .object({
    id: ExtractionPipelineIdSchema,
    name: ExtractionPipelineNameSchema,
    slug: ExtractionPipelineSlugSchema.nullable(),
    version: z.number().int().min(1),
    ocr_model: z.string().min(1).max(128),
    ocr_options: OcrOptionsEffectiveSchema,
    llm_model: LlmModelSchema,
    llm_options: LlmOptionsStoredSchema,
    schema: PipelineExtractionSchemaObjectSchema,
    repair_attempts: z.number().int().min(0).max(2),
    grounding: ExtractionGroundingModeSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict();
export type ExtractionPipeline = z.infer<typeof ExtractionPipelineSchema>;

export const ExtractionPipelineListResponseSchema = z
  .object({
    items: z.array(ExtractionPipelineSchema),
  })
  .strict();
export type ExtractionPipelineListResponse = z.infer<typeof ExtractionPipelineListResponseSchema>;

export const DeleteExtractionPipelineResponseSchema = z
  .object({
    deleted: z.literal(true),
    id: ExtractionPipelineIdSchema,
  })
  .strict();
export type DeleteExtractionPipelineResponse = z.infer<
  typeof DeleteExtractionPipelineResponseSchema
>;

/** Inline extract config fields forbidden when `pipeline_id` is present. */
export const EXTRACT_INLINE_CONFIG_KEYS = [
  'ocr_model',
  'ocr_options',
  'llm_model',
  'llm_options',
  'schema',
  'repair_attempts',
  'grounding',
] as const;

export type ExtractInlineConfigKey = (typeof EXTRACT_INLINE_CONFIG_KEYS)[number];

export function refineExtractPipelineXor(
  value: {
    pipeline_id?: string;
    ocr_model?: string;
    ocr_options?: unknown;
    llm_model?: string;
    llm_options?: unknown;
    schema?: Record<string, unknown>;
    repair_attempts?: number;
    grounding?: string;
  },
  ctx: z.RefinementCtx,
  options?: {
    requireOcrModel?: boolean;
  }
): void {
  const hasPipeline = value.pipeline_id !== undefined;
  const presentInline = EXTRACT_INLINE_CONFIG_KEYS.filter((key) => value[key] !== undefined);
  const requireOcrModel = options?.requireOcrModel !== false;

  if (hasPipeline && presentInline.length > 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'pipeline_inline_conflict',
      path: ['pipeline_id'],
    });
    return;
  }

  if (hasPipeline) return;

  if (requireOcrModel && value.ocr_model === undefined) {
    ctx.addIssue({ code: 'custom', message: 'Required', path: ['ocr_model'] });
  }
  if (value.llm_model === undefined) {
    ctx.addIssue({ code: 'custom', message: 'Required', path: ['llm_model'] });
  }
  if (value.schema === undefined) {
    ctx.addIssue({ code: 'custom', message: 'Required', path: ['schema'] });
  }
}
