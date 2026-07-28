import { z } from 'zod';

/**
 * Public OCR ParsedDocument `openparser@1` wire shapes (snake_case).
 * Normative companion: docs/OCR_API_OPENAPI.yaml
 */

export const BoundingBoxSchema = z
  .object({
    left: z.number().int().min(0),
    top: z.number().int().min(0),
    right: z.number().int().positive(),
    bottom: z.number().int().positive(),
  })
  .strict()
  .superRefine((box, ctx) => {
    if (box.right <= box.left || box.bottom <= box.top) {
      ctx.addIssue({
        code: 'custom',
        message: 'bounding box must have positive area',
      });
    }
  });

export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const PointSchema = z
  .object({
    x: z.number().min(0),
    y: z.number().min(0),
  })
  .strict();

export type Point = z.infer<typeof PointSchema>;

export const PolygonSchema = z.array(PointSchema).min(3);
export type Polygon = z.infer<typeof PolygonSchema>;

export const PAGE_BLOCK_KINDS = ['text', 'table', 'figure'] as const;
export const PageBlockKindSchema = z.enum(PAGE_BLOCK_KINDS);
export type PageBlockKind = z.infer<typeof PageBlockKindSchema>;

export const PageBlockSchema = z
  .object({
    index: z.number().int().min(0),
    page_number: z.number().int().min(1),
    kind: PageBlockKindSchema,
    text: z.string().nullable().optional(),
    table_html: z.string().nullable().optional(),
    figure_uri: z.string().nullable().optional(),
    bbox: BoundingBoxSchema.nullable().optional(),
    polygon: PolygonSchema.nullable().optional(),
    confidence: z.number().min(0).max(1).nullable().optional(),
    source_label: z.string().min(1).nullable().optional(),
    region_id: z.string().min(1).nullable().optional(),
    coordinate_width: z.number().int().positive().nullable().optional(),
    coordinate_height: z.number().int().positive().nullable().optional(),
  })
  .strict()
  .superRefine((block, ctx) => {
    const widthNull = block.coordinate_width == null;
    const heightNull = block.coordinate_height == null;
    if (widthNull !== heightNull) {
      ctx.addIssue({
        code: 'custom',
        message: 'block coordinate dimensions must be provided together',
        path: ['coordinate_width'],
      });
    }
    if (block.kind === 'text' && block.text == null) {
      ctx.addIssue({ code: 'custom', message: 'text blocks require text', path: ['text'] });
    }
    if (block.kind === 'table' && block.table_html == null) {
      ctx.addIssue({
        code: 'custom',
        message: 'table blocks require table_html',
        path: ['table_html'],
      });
    }
    // Figure geometry is always retained; figure_uri is optional when no bounded
    // crop asset was materialized for this detection.
  });

export type PageBlock = z.infer<typeof PageBlockSchema>;

export const REGION_TYPES = [
  'text',
  'heading',
  'table',
  'key_value',
  'figure',
  'checkbox',
  'signature',
  'barcode',
  'formula',
  'header_footer',
] as const;
export const RegionTypeSchema = z.enum(REGION_TYPES);
export type RegionType = z.infer<typeof RegionTypeSchema>;

export const RegionSchema = z
  .object({
    id: z.string().min(1),
    page_number: z.number().int().min(1),
    type: RegionTypeSchema,
    bbox: BoundingBoxSchema,
    polygon: PolygonSchema.nullable().optional(),
    coordinate_width: z.number().int().positive().nullable().optional(),
    coordinate_height: z.number().int().positive().nullable().optional(),
    confidence: z.number().min(0).max(1).nullable().optional(),
    source_label: z.string().min(1).nullable().optional(),
  })
  .strict()
  .superRefine((region, ctx) => {
    if ((region.coordinate_width == null) !== (region.coordinate_height == null)) {
      ctx.addIssue({
        code: 'custom',
        message: 'region coordinate dimensions must be provided together',
        path: ['coordinate_width'],
      });
    }
  });

export type Region = z.infer<typeof RegionSchema>;

export const CONTENT_KINDS = ['text', 'table', 'state', 'figure'] as const;
export const ContentKindSchema = z.enum(CONTENT_KINDS);
export type ContentKind = z.infer<typeof ContentKindSchema>;

export const RegionContentSchema = z
  .object({
    region_id: z.string().min(1),
    kind: ContentKindSchema,
    text: z.string().nullable().optional(),
    table_html: z.string().nullable().optional(),
    detected_state: z.boolean().nullable().optional(),
    confidence: z.number().min(0).max(1).nullable().optional(),
  })
  .strict()
  .superRefine((content, ctx) => {
    if (content.text == null && content.table_html == null && content.detected_state == null) {
      ctx.addIssue({
        code: 'custom',
        message: 'region content must contain a payload',
      });
    }
    if (content.kind === 'table' && content.table_html == null) {
      ctx.addIssue({
        code: 'custom',
        message: 'table content requires table_html',
        path: ['table_html'],
      });
    }
    if (content.kind === 'state' && content.detected_state == null) {
      ctx.addIssue({
        code: 'custom',
        message: 'state content requires detected_state',
        path: ['detected_state'],
      });
    }
  });

export type RegionContent = z.infer<typeof RegionContentSchema>;

const Sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/);

export const ChunkProvenanceSpanSchema = z
  .object({
    start_char: z.number().int().min(0),
    end_char: z.number().int().positive(),
    page_number: z.number().int().min(1),
    bbox: BoundingBoxSchema,
    region_id: z.string().min(1),
  })
  .strict()
  .superRefine((span, ctx) => {
    if (span.end_char <= span.start_char) {
      ctx.addIssue({
        code: 'custom',
        message: 'chunk provenance span must have positive length',
      });
    }
  });

export type ChunkProvenanceSpan = z.infer<typeof ChunkProvenanceSpanSchema>;

export const ExtractionChunkSchema = z
  .object({
    id: Sha256HexSchema,
    index: z.number().int().min(0),
    document_id: z.string().min(1),
    text: z.string().min(1),
    content_sha256: Sha256HexSchema,
    page_numbers: z.array(z.number().int().min(1)).optional().default([]),
    page_start: z.number().int().min(1).nullable().optional(),
    page_end: z.number().int().min(1).nullable().optional(),
    region_ids: z.array(z.string().min(1)).optional().default([]),
    provenance_spans: z.array(ChunkProvenanceSpanSchema).optional().default([]),
  })
  .strict()
  .superRefine((chunk, ctx) => {
    if ((chunk.page_start == null) !== (chunk.page_end == null)) {
      ctx.addIssue({
        code: 'custom',
        message: 'page_start and page_end must be provided together',
        path: ['page_start'],
      });
    }
  });

export type ExtractionChunk = z.infer<typeof ExtractionChunkSchema>;

/** Canonical public OCR parse result (`output_format = openparser@1`). */
export const ParsedDocumentSchema = z
  .object({
    output_format: z.literal('openparser@1'),
    document_id: z.string().min(1),
    page_count: z.number().int().min(0),
    markdown: z.string(),
    blocks: z.array(PageBlockSchema).min(1),
    regions: z.array(RegionSchema).default([]),
    contents: z.array(RegionContentSchema).default([]),
    chunks: z.array(ExtractionChunkSchema).default([]),
  })
  .strict()
  .superRefine((doc, ctx) => {
    const indexes = doc.blocks.map((block) => block.index);
    for (let i = 0; i < indexes.length; i++) {
      if (indexes[i] !== i) {
        ctx.addIssue({
          code: 'custom',
          message: 'block indexes must be contiguous and zero-based',
          path: ['blocks', i, 'index'],
        });
        break;
      }
    }
    for (const [i, block] of doc.blocks.entries()) {
      if (block.page_number > doc.page_count) {
        ctx.addIssue({
          code: 'custom',
          message: 'block page exceeds page_count',
          path: ['blocks', i, 'page_number'],
        });
      }
    }
    for (const [i, region] of doc.regions.entries()) {
      if (region.page_number > doc.page_count) {
        ctx.addIssue({
          code: 'custom',
          message: 'region page exceeds page_count',
          path: ['regions', i, 'page_number'],
        });
      }
    }
  });

export type ParsedDocument = z.infer<typeof ParsedDocumentSchema>;
