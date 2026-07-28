import { z } from 'zod';
import { BoundingBoxSchema, PAGE_BLOCK_KINDS, REGION_TYPES } from './parsed-document';

/**
 * Optional field-level extraction grounding wire shapes.
 * Normative companion: docs/OCR_API_OPENAPI.yaml
 */

export const EXTRACTION_GROUNDING_MODES = ['none', 'field'] as const;
export const ExtractionGroundingModeSchema = z.enum(EXTRACTION_GROUNDING_MODES);
export type ExtractionGroundingMode = z.infer<typeof ExtractionGroundingModeSchema>;

export const EXTRACTION_CITATION_GRANULARITIES = ['block', 'region'] as const;
export const ExtractionCitationGranularitySchema = z.enum(EXTRACTION_CITATION_GRANULARITIES);
export type ExtractionCitationGranularity = z.infer<typeof ExtractionCitationGranularitySchema>;

const CitationSourceTypeSchema = z.enum([...PAGE_BLOCK_KINDS, ...REGION_TYPES]);

/** Verified provenance for one extracted leaf citation. */
export const ExtractionCitationSchema = z
  .object({
    block_index: z.number().int().min(0),
    region_id: z.string().min(1).optional(),
    page_number: z.number().int().min(1),
    bbox: BoundingBoxSchema,
    coordinate_width: z.number().int().positive().nullable().optional(),
    coordinate_height: z.number().int().positive().nullable().optional(),
    source_type: CitationSourceTypeSchema,
    granularity: ExtractionCitationGranularitySchema,
    confidence: z.number().min(0).max(1).optional(),
  })
  .strict();

export type ExtractionCitation = z.infer<typeof ExtractionCitationSchema>;

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
