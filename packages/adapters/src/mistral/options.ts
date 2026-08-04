import { z } from 'zod';
import { MistralOcrError } from './errors';

export const MISTRAL_TABLE_FORMATS = ['html', 'markdown'] as const;
export type MistralTableFormat = (typeof MISTRAL_TABLE_FORMATS)[number];

export const MISTRAL_CONFIDENCE_GRANULARITIES = ['page', 'word'] as const;
export type MistralConfidenceScoresGranularity = (typeof MISTRAL_CONFIDENCE_GRANULARITIES)[number];

const MistralCommonOptionsShape = {
  table_format: z.enum(MISTRAL_TABLE_FORMATS).optional(),
  extract_header: z.boolean().optional(),
  extract_footer: z.boolean().optional(),
  confidence_scores_granularity: z.enum(MISTRAL_CONFIDENCE_GRANULARITIES).nullable().optional(),
} as const;

/**
 * Provider-native options for Mistral OCR models that do not accept `include_blocks`
 * (for example `mistral-ocr-2512`).
 */
export const MistralOcrLegacyRequestOptionsSchema = z.object(MistralCommonOptionsShape).strict();

/**
 * Provider-native options for Mistral OCR 4 family (`mistral-ocr-4-*`), including `include_blocks`.
 */
export const MistralOcr4RequestOptionsSchema = z
  .object({
    ...MistralCommonOptionsShape,
    include_blocks: z.boolean().optional(),
  })
  .strict();

/** Union of all documented Mistral OCR request option keys (strict per-model schemas preferred). */
export const MistralOcrRequestOptionsSchema = MistralOcr4RequestOptionsSchema;

export type MistralOcrRequestOptions = z.infer<typeof MistralOcr4RequestOptionsSchema>;
export type MistralOcrLegacyRequestOptions = z.infer<typeof MistralOcrLegacyRequestOptionsSchema>;

/**
 * Real provider fact: `include_blocks` is an OCR 4 request field.
 * Model ids matching `mistral-ocr-4` / `mistral-ocr-4-*` use the OCR 4 options schema.
 */
export function mistralModelSupportsIncludeBlocks(model: string): boolean {
  const trimmed = model.trim();
  return trimmed === 'mistral-ocr-4' || trimmed.startsWith('mistral-ocr-4-');
}

export function mistralOcrOptionsSchemaForModel(
  model: string
): typeof MistralOcr4RequestOptionsSchema | typeof MistralOcrLegacyRequestOptionsSchema {
  return mistralModelSupportsIncludeBlocks(model)
    ? MistralOcr4RequestOptionsSchema
    : MistralOcrLegacyRequestOptionsSchema;
}

export function parseMistralOcrRequestOptions(
  model: string,
  options: unknown
): MistralOcrRequestOptions | MistralOcrLegacyRequestOptions {
  const schema = mistralOcrOptionsSchemaForModel(model);
  const parsed = schema.safeParse(options ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new MistralOcrError(
      issue
        ? `Mistral OCR option invalid: ${issue.path.join('.') || '(root)'} ${issue.message}`
        : 'Mistral OCR options are invalid',
      false
    );
  }
  return parsed.data;
}

export function toMistralOcrNativeRequestBody(input: {
  model: string;
  document: Record<string, string>;
  options?: MistralOcrRequestOptions;
}): Record<string, unknown> {
  if (!input.model.trim()) throw new MistralOcrError('Mistral OCR model is required', false);
  const options = parseMistralOcrRequestOptions(input.model, input.options ?? {});

  return {
    model: input.model,
    document: input.document,
    ...Object.fromEntries(
      Object.entries(options).filter(([, value]) => value !== undefined && value !== null)
    ),
  };
}
