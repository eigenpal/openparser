/**
 * Model-aware public OCR / LLM option contracts.
 */
import { z } from 'zod';
import { OcrLlmReasoningEffortRequestSchema } from './llm-models';

export const PaddleOcrOptionsRequestSchema = z
  .object({
    image_block_ocr: z.boolean().optional(),
    chart_recognition: z.boolean().optional(),
    merge_layout_blocks: z
      .boolean()
      .optional()
      .describe(
        'Merge nearby cross-column or staggered text regions before recognition. Defaults to false to preserve one-to-one text and bounding-box alignment.'
      ),
  })
  .strict();
export type PaddleOcrOptionsRequest = z.infer<typeof PaddleOcrOptionsRequestSchema>;

export const PaddleOcrOptionsEffectiveSchema = z
  .object({
    image_block_ocr: z.boolean(),
    chart_recognition: z.boolean(),
    merge_layout_blocks: z.boolean(),
  })
  .strict();
export type PaddleOcrOptionsEffective = z.infer<typeof PaddleOcrOptionsEffectiveSchema>;

export const PADDLE_OCR_OPTION_DEFAULTS = {
  image_block_ocr: false,
  chart_recognition: true,
  merge_layout_blocks: false,
} as const satisfies PaddleOcrOptionsEffective;

export const OcrOptionsRequestSchema = PaddleOcrOptionsRequestSchema;
export type OcrOptionsRequest = PaddleOcrOptionsRequest;
export const OcrOptionsEffectiveSchema = PaddleOcrOptionsEffectiveSchema;
export type OcrOptionsEffective = PaddleOcrOptionsEffective;

export const LlmOptionsRequestSchema = z
  .object({ reasoning_effort: OcrLlmReasoningEffortRequestSchema.optional() })
  .strict();
export type LlmOptionsRequest = z.infer<typeof LlmOptionsRequestSchema>;

export const LlmOptionsStoredSchema = z
  .object({ reasoning_effort: OcrLlmReasoningEffortRequestSchema.nullable() })
  .strict();
export type LlmOptionsStored = z.infer<typeof LlmOptionsStoredSchema>;

export const OcrModelOptionCapabilitySchema = z
  .object({
    image_block_ocr: z.boolean(),
    chart_recognition: z.boolean(),
    merge_layout_blocks: z.boolean(),
  })
  .strict();
export type OcrModelOptionCapability = z.infer<typeof OcrModelOptionCapabilitySchema>;

export function applyPaddleOcrOptionDefaults(
  requested?: OcrOptionsRequest | null | Record<string, unknown>
): PaddleOcrOptionsEffective {
  const source =
    requested && typeof requested === 'object' ? (requested as Record<string, unknown>) : undefined;
  return {
    image_block_ocr:
      typeof source?.image_block_ocr === 'boolean'
        ? source.image_block_ocr
        : PADDLE_OCR_OPTION_DEFAULTS.image_block_ocr,
    chart_recognition:
      typeof source?.chart_recognition === 'boolean'
        ? source.chart_recognition
        : PADDLE_OCR_OPTION_DEFAULTS.chart_recognition,
    merge_layout_blocks:
      typeof source?.merge_layout_blocks === 'boolean'
        ? source.merge_layout_blocks
        : PADDLE_OCR_OPTION_DEFAULTS.merge_layout_blocks,
  };
}
