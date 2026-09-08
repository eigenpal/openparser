import {
  BoundingBoxSchema,
  ConfidenceSchema,
  DocumentElementKindSchema,
  PolygonSchema,
} from '@openparser/schema';
import { z } from 'zod';

/**
 * Optional field-level extraction grounding wire shapes.
 * Canonical home for grounded extraction producers; hosted API re-exports these.
 */

export const EXTRACTION_GROUNDING_MODES = ['none', 'field'] as const;
export const ExtractionGroundingModeSchema = z.enum(EXTRACTION_GROUNDING_MODES);
export type ExtractionGroundingMode = z.infer<typeof ExtractionGroundingModeSchema>;

export const EXTRACTION_CITATION_GRANULARITIES = ['element', 'table_cell', 'text_span'] as const;
export const ExtractionCitationGranularitySchema = z.enum(EXTRACTION_CITATION_GRANULARITIES);
export type ExtractionCitationGranularity = z.infer<typeof ExtractionCitationGranularitySchema>;

/** Verified provenance for one extracted leaf citation. */
export const ExtractionCitationSchema = z
  .object({
    element_id: z.string().min(1),
    /**
     * Logical table-cell address. It may accompany `granularity: "element"`
     * when the provider identified the cell but supplied only table geometry.
     */
    table_cell_id: z.string().min(1).optional(),
    page_number: z.number().int().min(1),
    bbox: BoundingBoxSchema,
    polygon: PolygonSchema.optional(),
    source_type: DocumentElementKindSchema,
    granularity: ExtractionCitationGranularitySchema,
    confidence: ConfidenceSchema.optional(),
  })
  .strict()
  .superRefine((citation, ctx) => {
    if (citation.granularity === 'table_cell' && citation.table_cell_id === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'table_cell citations require table_cell_id',
        path: ['table_cell_id'],
      });
    }
  });

export type ExtractionCitation = z.infer<typeof ExtractionCitationSchema>;

export const TRANSFORM_CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export const TransformConfidenceLevelSchema = z.enum(TRANSFORM_CONFIDENCE_LEVELS);
export type TransformConfidenceLevel = z.infer<typeof TransformConfidenceLevelSchema>;

export const TRANSFORM_CLAIM_OPERATIONS = [
  'date_time_format',
  'numeric_format',
  'quantity_magnitude',
  'unit_conversion',
  'currency_code',
  'boolean_alias',
  'text_normalization',
  'enum_alias',
] as const;
export const TransformClaimOperationSchema = z.enum(TRANSFORM_CLAIM_OPERATIONS);
export type TransformClaimOperation = z.infer<typeof TransformClaimOperationSchema>;
export const ExtractionTransformClaimSchema = z
  .object({
    operation: TransformClaimOperationSchema,
    parameters: z
      .record(z.string().max(64), z.union([z.string().max(128), z.number().finite(), z.boolean()]))
      .refine((value) => Object.keys(value).length <= 16, 'at most 16 claim parameters'),
    reason: z.string().min(1).max(2_000),
    confidence: TransformConfidenceLevelSchema.optional(),
  })
  .strict();
export type ExtractionTransformClaim = z.infer<typeof ExtractionTransformClaimSchema>;

/** Grounding metadata for one leaf JSON path in the unwrapped output. */
export const ExtractionGroundingFieldSchema = z
  .object({
    /**
     * Dot-separated path from the output root. Array positions are decimal
     * segments, for example `line_items.0.amount`.
     */
    path: z.string().min(1),
    citations: z.array(ExtractionCitationSchema),
    dropped_source_ids: z.array(z.string().min(1)).optional(),
    /** Model-reported confidence in the extracted value (0–1), when supplied. */
    confidence: z.number().min(0).max(1).optional(),
    /**
     * One or two sentences from the model explaining why the quote is the source
     * for this value: what in the document identifies it. This covers the read
     * only; how the quote became the value is `transform_claim.reason`. Omitted when
     * none was recorded.
     */
    reason: z.string().min(1).max(2_000).optional(),
    /**
     * The span of document text the model says this value came from, copied
     * verbatim. Useful when the value was reformatted and so cannot be found in
     * the document as written. Like `reason` this is the model's own report;
     * lineage keeps it only after locating it in the parsed text. Omitted when
     * none was recorded.
     */
    quote: z.string().min(1).max(4_096).optional(),
    /**
     * The model's bounded, untrusted report about a rewrite. The producer never
     * uses this claim as authority: only request/schema intent can select a
     * deterministic validator. `source_format` may only prioritize a member of
     * the trusted built-in date source catalog; it cannot add formats or
     * authorize `verified`. Omitted for verbatim values.
     */
    transform_claim: ExtractionTransformClaimSchema.optional(),
  })
  .strict();

export type ExtractionGroundingField = z.infer<typeof ExtractionGroundingFieldSchema>;

/** Optional terminal grounding envelope present only when `grounding: field` succeeded. */
export const ExtractionGroundingResultSchema = z
  .object({
    mode: z.literal('field'),
    fields: z.array(ExtractionGroundingFieldSchema),
  })
  .strict();

export type ExtractionGroundingResult = z.infer<typeof ExtractionGroundingResultSchema>;
