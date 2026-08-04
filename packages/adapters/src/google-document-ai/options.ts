import { z } from 'zod';
import { GoogleDocumentAiAdapterError } from './errors';

/** Provider-native Enterprise Document OCR process options. */
export const GoogleDocumentAiOcrOptionsSchema = z
  .object({
    native_pdf_parsing: z.boolean().optional(),
    image_quality_scores: z.boolean().optional(),
    symbols: z.boolean().optional(),
    language_hints: z.array(z.string().trim().min(2).max(35)).max(10).nullable().optional(),
    math_ocr: z.boolean().optional(),
    selection_marks: z.boolean().optional(),
    style_info: z.boolean().optional(),
  })
  .strict();

export type GoogleDocumentAiOcrOptions = z.infer<typeof GoogleDocumentAiOcrOptionsSchema>;

/**
 * Enterprise OCR processor type used by this adapter's ProcessDocument path.
 * Other processor types are out of scope for these option mappings.
 */
export const GOOGLE_DOCAI_OCR_PROCESSOR_TYPE = 'OCR_PROCESSOR' as const;

export function parseGoogleDocumentAiOcrOptions(options: unknown): GoogleDocumentAiOcrOptions {
  const parsed = GoogleDocumentAiOcrOptionsSchema.safeParse(options ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new GoogleDocumentAiAdapterError(
      issue
        ? `Google Document AI option invalid: ${issue.path.join('.') || '(root)'} ${issue.message}`
        : 'Google Document AI options are invalid'
    );
  }
  return parsed.data;
}

/**
 * Translate public snake_case options into Google ProcessDocument `processOptions.ocrConfig`.
 */
export function toGoogleDocumentAiProcessOptions(
  options?: GoogleDocumentAiOcrOptions
): Record<string, unknown> | undefined {
  if (!options || Object.keys(options).length === 0) return undefined;
  const validated = parseGoogleDocumentAiOcrOptions(options);
  const ocrConfig: Record<string, unknown> = {};
  if (validated.native_pdf_parsing !== undefined) {
    ocrConfig.enableNativePdfParsing = validated.native_pdf_parsing;
  }
  if (validated.image_quality_scores !== undefined) {
    ocrConfig.enableImageQualityScores = validated.image_quality_scores;
  }
  if (validated.symbols !== undefined) ocrConfig.enableSymbol = validated.symbols;
  if (validated.language_hints != null) {
    ocrConfig.hints = { languageHints: validated.language_hints };
  }
  const premiumFeatures: Record<string, boolean> = {};
  if (validated.math_ocr !== undefined) premiumFeatures.enableMathOcr = validated.math_ocr;
  if (validated.selection_marks !== undefined) {
    premiumFeatures.enableSelectionMarkDetection = validated.selection_marks;
  }
  if (validated.style_info !== undefined) premiumFeatures.computeStyleInfo = validated.style_info;
  if (Object.keys(premiumFeatures).length > 0) ocrConfig.premiumFeatures = premiumFeatures;
  if (Object.keys(ocrConfig).length === 0) return undefined;
  return { ocrConfig };
}
