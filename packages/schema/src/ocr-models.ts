/**
 * OpenParser API model catalog contracts.
 */
import { z } from 'zod';
import {
  OcrModelOptionCapabilitySchema,
  PADDLE_OCR_OPTION_DEFAULTS,
  type OcrModelOptionCapability,
} from './model-options';

export const OCR_MODELS = ['paddleocr-vl-1.6'] as const;
export type OcrModelId = (typeof OCR_MODELS)[number];

export const OcrModelAvailabilitySchema = z.enum(['available', 'degraded', 'unavailable']);
export type OcrModelAvailability = z.infer<typeof OcrModelAvailabilitySchema>;

export const OcrModelPricingBasisSchema = z.literal('customer_retail');
export type OcrModelPricingBasis = z.infer<typeof OcrModelPricingBasisSchema>;

/**
 * Customer retail page price for an OCR model. Pricing belongs on the model
 * because future models or options may differ. Never expose provider cost here.
 */
export const OcrModelPricingSchema = z
  .object({
    usd_per_page: z.number().finite().nonnegative(),
    basis: OcrModelPricingBasisSchema,
  })
  .strict();
export type OcrModelPricing = z.infer<typeof OcrModelPricingSchema>;

/**
 * Sole literal source for PaddleOCR-VL 1.6 customer retail page price.
 * All public OCR page prices flow through {@link OCR_MODEL_CATALOG}; do not
 * duplicate this number elsewhere as an independent authority.
 */
export const PADDLE_OCR_USD_PER_PAGE = 0.001 as const;

export const OcrModelCatalogEntrySchema = z
  .object({
    id: z.string().min(1).max(128),
    label: z.string().min(1).max(120),
    is_default: z.boolean(),
    capabilities: z
      .object({
        parse: z.boolean(),
        extract_source: z.boolean(),
        markdown: z.boolean(),
        regions: z.boolean(),
        options: OcrModelOptionCapabilitySchema,
      })
      .strict(),
    option_defaults: z
      .object({
        image_block_ocr: z.boolean(),
        chart_recognition: z.boolean(),
        merge_layout_blocks: z.boolean(),
      })
      .strict(),
    pricing: OcrModelPricingSchema,
    availability: OcrModelAvailabilitySchema,
  })
  .strict();
export type OcrModelCatalogEntry = z.infer<typeof OcrModelCatalogEntrySchema>;

export const OcrModelsResponseSchema = z
  .object({ data: z.array(OcrModelCatalogEntrySchema).min(1) })
  .strict();
export type OcrModelsResponse = z.infer<typeof OcrModelsResponseSchema>;

const PADDLE_OPTION_CAPABILITIES = {
  image_block_ocr: true,
  chart_recognition: true,
  merge_layout_blocks: true,
} as const satisfies OcrModelOptionCapability;

export const OCR_MODEL_CATALOG = [
  {
    id: 'paddleocr-vl-1.6',
    label: 'PaddleOCR-VL 1.6',
    is_default: true,
    capabilities: {
      parse: true,
      extract_source: true,
      markdown: true,
      regions: true,
      options: PADDLE_OPTION_CAPABILITIES,
    },
    option_defaults: { ...PADDLE_OCR_OPTION_DEFAULTS },
    pricing: {
      usd_per_page: PADDLE_OCR_USD_PER_PAGE,
      basis: 'customer_retail' as const,
    },
    availability: 'available' as const,
  },
] as const satisfies readonly OcrModelCatalogEntry[];

export function getDefaultOcrModelId(): OcrModelId {
  const defaults = OCR_MODEL_CATALOG.filter((entry) => entry.is_default);
  if (defaults.length !== 1) {
    throw new Error('OCR_MODEL_CATALOG must declare exactly one default model');
  }
  return defaults[0]!.id;
}

/** Resolve customer retail USD/page for a known OCR model id. */
export function getOcrModelUsdPerPage(modelId: string): number | null {
  const entry = OCR_MODEL_CATALOG.find((model) => model.id === modelId);
  const usd = entry?.pricing.usd_per_page;
  if (usd == null || !Number.isFinite(usd) || usd < 0) return null;
  return usd;
}

/**
 * Fail-closed catalog lookup used at OCR admission. Every registered OCR model
 * MUST declare finite non-negative customer retail page pricing.
 */
export function requireOcrModelUsdPerPage(modelId: string): number {
  const usd = getOcrModelUsdPerPage(modelId);
  if (usd == null) {
    throw new Error(`OCR model ${modelId} is missing customer retail page pricing`);
  }
  return usd;
}
