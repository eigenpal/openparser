/**
 * Public OpenParser LLM model catalog contracts (`GET /models/llm` / OpenAPI).
 *
 * Clients discover models via `GET /models/llm`. Ordinary extract may use any
 * currently *compatible* catalog entry. Field grounding and schema suggestion
 * remain restricted to certified models. Admission still accepts a free-form
 * `llm_model` string first so the registry can return a stable
 * `unsupported_llm_model` (or capability) API error — same pattern as
 * `OcrModelSchema` / `unsupported_ocr_model`.
 *
 * Provider cost, billing policy, operational defaults, and admit-time state
 * are intentionally outside this public wire-contract package.
 */

import { z } from 'zod';

export const OCR_LLM_REASONING_EFFORTS = [
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const;
export const OcrLlmReasoningEffortSchema = z.enum(OCR_LLM_REASONING_EFFORTS);
export type OcrLlmReasoningEffort = z.infer<typeof OcrLlmReasoningEffortSchema>;

/** Request contract: omit/`auto` uses model metadata; explicit values must be supported. */
export const OcrLlmReasoningEffortRequestSchema = z.union([
  z.literal('auto'),
  OcrLlmReasoningEffortSchema,
]);
export type OcrLlmReasoningEffortRequest = z.infer<typeof OcrLlmReasoningEffortRequestSchema>;

export const OcrLlmRecommendationTierSchema = z.enum(['suggested', 'compatible']);
export type OcrLlmRecommendationTier = z.infer<typeof OcrLlmRecommendationTierSchema>;

/** Public OpenAPI / `GET /models/llm` pricing basis — retail only. */
export const OcrLlmPublicPricingBasisSchema = z.literal('customer_retail');
export type OcrLlmPublicPricingBasis = z.infer<typeof OcrLlmPublicPricingBasisSchema>;

/**
 * Public customer-retail token pricing (`GET /models/llm` / OpenAPI).
 * Provider-list cost is intentionally excluded from this schema.
 */
export const OcrLlmModelPricingSchema = z
  .object({
    /** USD per 1M prompt tokens at the customer retail rate. */
    prompt_usd_per_1m: z.number().finite().nonnegative(),
    /** USD per 1M completion tokens at the customer retail rate. */
    completion_usd_per_1m: z.number().finite().nonnegative(),
    basis: OcrLlmPublicPricingBasisSchema,
  })
  .strict();
export type OcrLlmModelPricing = z.infer<typeof OcrLlmModelPricingSchema>;

export const OcrLlmModelReasoningSchema = z
  .object({
    supported_efforts: z.array(OcrLlmReasoningEffortSchema).nullable(),
    default_effort: OcrLlmReasoningEffortSchema.nullable(),
    mandatory: z.boolean(),
    supports_max_tokens: z.boolean(),
  })
  .strict();
export type OcrLlmModelReasoning = z.infer<typeof OcrLlmModelReasoningSchema>;

/** Public catalog entry returned by `GET /models/llm` (OpenAPI component). */
export const OcrLlmModelCatalogEntrySchema = z
  .object({
    id: z.string().min(1).max(200),
    label: z.string().min(1).max(120),
    provider: z.string().min(1).max(64),
    created_at: z.string().datetime().nullable(),
    context_length: z.number().int().positive().nullable(),
    recommendation: OcrLlmRecommendationTierSchema,
    is_default: z.boolean(),
    /** Certified for field grounding (tested). */
    certified_grounding: z.boolean(),
    /** Certified for schema suggestion (tested). */
    certified_suggest: z.boolean(),
    /**
     * Compatibility aliases for Playground clients that still filter on the
     * previous catalog field names. Equal to the certified_* flags.
     */
    supports_grounding: z.boolean(),
    supports_suggest: z.boolean(),
    pricing_known: z.literal(true),
    reasoning: OcrLlmModelReasoningSchema.nullable(),
    deprecated_at: z.string().datetime().nullable(),
    pricing: OcrLlmModelPricingSchema,
  })
  .strict();
export type OcrLlmModelCatalogEntry = z.infer<typeof OcrLlmModelCatalogEntrySchema>;

export const OcrLlmModelsListModeSchema = z.enum(['suggested', 'search']);
export type OcrLlmModelsListMode = z.infer<typeof OcrLlmModelsListModeSchema>;

export const OcrLlmModelsQuerySchema = z
  .object({
    /**
     * `suggested` (default): short recommended subset.
     * `search`: full compatible catalog filtered by `q`.
     */
    mode: OcrLlmModelsListModeSchema.default('suggested'),
    /** Case-insensitive substring match against id/label/provider. */
    q: z.string().max(200).optional(),
    /** 1-based page index when paginating search results. */
    page: z.coerce.number().int().min(1).default(1),
    /** Page size for search; ignored for suggested mode (bounded server-side). */
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
export type OcrLlmModelsQuery = z.infer<typeof OcrLlmModelsQuerySchema>;

export const OcrLlmModelsResponseSchema = z
  .object({
    mode: OcrLlmModelsListModeSchema,
    catalog_version: z.string().min(1),
    fetched_at: z.string().datetime(),
    stale: z.boolean(),
    data: z.array(OcrLlmModelCatalogEntrySchema),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    has_more: z.boolean(),
  })
  .strict();
export type OcrLlmModelsResponse = z.infer<typeof OcrLlmModelsResponseSchema>;
