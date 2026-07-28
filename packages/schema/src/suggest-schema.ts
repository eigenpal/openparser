import { z } from 'zod';
import { ExtractionAttemptSchema, ExtractionUsageTotalsSchema, LlmModelSchema } from './extraction';
import { JobIdInputSchema } from './id-compat';
import { JobIdSchema } from './job-id';
import { OcrLlmReasoningEffortSchema } from './llm-models';

export const SUGGEST_SCHEMA_HINT_MAX_CHARS = 500;
export const SUGGEST_SCHEMA_PREVIEW_MAX_PAGES = 2;
export const SUGGEST_SCHEMA_PREVIEW_MAX_CHARS = 24_000;

export const SuggestSchemaHintSchema = z.string().min(1).max(SUGGEST_SCHEMA_HINT_MAX_CHARS);
export type SuggestSchemaHint = z.infer<typeof SuggestSchemaHintSchema>;

export const SuggestSchemaRequestSchema = z
  .object({
    parse_job_id: JobIdInputSchema,
    hint: SuggestSchemaHintSchema.optional(),
  })
  .strict();
export type SuggestSchemaRequest = z.infer<typeof SuggestSchemaRequestSchema>;

export const SuggestSchemaResponseSchema = z
  .object({
    name: z.string().min(1).max(200),
    schema: z.record(z.string(), z.unknown()),
  })
  .strict();
export type SuggestSchemaResponse = z.infer<typeof SuggestSchemaResponseSchema>;

export const SuggestSchemaPreviewMetaSchema = z
  .object({
    max_pages: z.literal(SUGGEST_SCHEMA_PREVIEW_MAX_PAGES),
    max_chars: z.literal(SUGGEST_SCHEMA_PREVIEW_MAX_CHARS),
    truncated: z.boolean(),
    char_count: z.number().int().min(0).max(SUGGEST_SCHEMA_PREVIEW_MAX_CHARS),
  })
  .strict();
export type SuggestSchemaPreviewMeta = z.infer<typeof SuggestSchemaPreviewMetaSchema>;

export const SuggestSchemaTerminalResultSchema = z
  .object({
    name: z.string().min(1).max(200),
    schema: z.record(z.string(), z.unknown()),
    parse_job_id: JobIdSchema,
    llm_model: LlmModelSchema,
    reasoning_effort: OcrLlmReasoningEffortSchema.nullable().optional(),
    hint: SuggestSchemaHintSchema.optional(),
    preview: SuggestSchemaPreviewMetaSchema,
    attempts: z.array(ExtractionAttemptSchema).min(1),
    usage: ExtractionUsageTotalsSchema.optional(),
  })
  .strict();
export type SuggestSchemaTerminalResult = z.infer<typeof SuggestSchemaTerminalResultSchema>;
