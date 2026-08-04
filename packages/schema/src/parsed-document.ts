import { z } from 'zod';
import {
  findOverlappingTableCellIds,
  MAX_TABLE_CELL_ROW_COVERAGE,
} from './internal/table-cell-overlap';

/**
 * Vendor-neutral OpenParser canonical document (`openparser@1`).
 *
 * The schema models provider output as a document graph: pages establish
 * coordinate spaces, elements carry semantic payloads, and relations preserve
 * hierarchy and cross-element meaning. Provider-native responses remain
 * available through the separate `raw` output format.
 */

export const PointSchema = z
  .object({
    x: z.number().finite().min(0),
    y: z.number().finite().min(0),
  })
  .strict();
export type Point = z.infer<typeof PointSchema>;

export const PolygonSchema = z.array(PointSchema).min(3);
export type Polygon = z.infer<typeof PolygonSchema>;

export const BoundingBoxSchema = z
  .object({
    left: z.number().finite().min(0),
    top: z.number().finite().min(0),
    right: z.number().finite().positive(),
    bottom: z.number().finite().positive(),
  })
  .strict()
  .superRefine((box, ctx) => {
    if (box.right <= box.left || box.bottom <= box.top) {
      ctx.addIssue({ code: 'custom', message: 'bounding box must have positive area' });
    }
  });
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const CONFIDENCE_SCOPES = [
  'detection',
  'recognition',
  'classification',
  'geometry',
  'answer',
  'quality',
] as const;
export const ConfidenceScopeSchema = z.enum(CONFIDENCE_SCOPES);
export type ConfidenceScope = z.infer<typeof ConfidenceScopeSchema>;

export const CONFIDENCE_SOURCE_SCALES = [
  'zero_to_one',
  'zero_to_hundred',
  'log_probability',
  'unknown',
] as const;
export const ConfidenceSourceScaleSchema = z.enum(CONFIDENCE_SOURCE_SCALES);
export type ConfidenceSourceScale = z.infer<typeof ConfidenceSourceScaleSchema>;

/**
 * `score` is normalized to [0, 1]. `calibrated=false` means scores from
 * different providers or scopes must not be compared as equivalent
 * probabilities. `source_*` preserves the provider's original scale.
 */
export const ConfidenceSchema = z
  .object({
    score: z.number().finite().min(0).max(1),
    scope: ConfidenceScopeSchema,
    calibrated: z.boolean().default(false),
    source_value: z.number().finite().optional(),
    source_scale: ConfidenceSourceScaleSchema.optional(),
  })
  .strict()
  .superRefine((confidence, ctx) => {
    if ((confidence.source_value === undefined) !== (confidence.source_scale === undefined)) {
      ctx.addIssue({
        code: 'custom',
        message: 'source_value and source_scale must be provided together',
        path: ['source_value'],
      });
    }
  });
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const GeometrySchema = z
  .object({
    page_number: z.number().int().min(1),
    bbox: BoundingBoxSchema,
    polygon: PolygonSchema.optional(),
    rotation_degrees: z.number().finite().min(-360).max(360).optional(),
  })
  .strict();
export type Geometry = z.infer<typeof GeometrySchema>;

/** Half-open UTF-16 code-unit offsets into `ParsedDocument.text`. */
export const TextSpanSchema = z
  .object({
    start: z.number().int().min(0),
    end: z.number().int().positive(),
  })
  .strict()
  .superRefine((span, ctx) => {
    if (span.end <= span.start) {
      ctx.addIssue({ code: 'custom', message: 'text span must have positive length' });
    }
  });
export type TextSpan = z.infer<typeof TextSpanSchema>;

export const LanguageSchema = z
  .object({
    code: z.string().trim().min(1).max(64),
    confidence: ConfidenceSchema.optional(),
  })
  .strict();
export type Language = z.infer<typeof LanguageSchema>;

export const TEXT_SIZE_UNITS = ['pixel', 'point', 'inch', 'em', 'unknown'] as const;
export const TextSizeUnitSchema = z.enum(TEXT_SIZE_UNITS);
export type TextSizeUnit = z.infer<typeof TextSizeUnitSchema>;

export const TextStyleSchema = z
  .object({
    font_family: z.string().trim().min(1).optional(),
    font_size: z.number().finite().positive().optional(),
    font_size_unit: TextSizeUnitSchema.optional(),
    font_weight: z.number().int().min(1).max(1000).optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
    handwritten: z.boolean().optional(),
    monospace: z.boolean().optional(),
    small_caps: z.boolean().optional(),
    superscript: z.boolean().optional(),
    subscript: z.boolean().optional(),
    foreground_color: z.string().trim().min(1).optional(),
    background_color: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((style, ctx) => {
    if ((style.font_size === undefined) !== (style.font_size_unit === undefined)) {
      ctx.addIssue({
        code: 'custom',
        message: 'font_size and font_size_unit must be provided together',
        path: ['font_size'],
      });
    }
    if (style.superscript === true && style.subscript === true) {
      ctx.addIssue({
        code: 'custom',
        message: 'text cannot be both superscript and subscript',
        path: ['superscript'],
      });
    }
  });
export type TextStyle = z.infer<typeof TextStyleSchema>;

export const SourceProvenanceSchema = z
  .object({
    native_id: z.string().min(1).optional(),
    native_type: z.string().min(1).optional(),
    native_label: z.string().min(1).optional(),
  })
  .strict();
export type SourceProvenance = z.infer<typeof SourceProvenanceSchema>;

const ElementBaseShape = {
  id: z.string().min(1),
  locations: z.array(GeometrySchema).default([]),
  confidence: ConfidenceSchema.optional(),
  source: SourceProvenanceSchema.optional(),
} as const;

export const TEXT_ROLES = [
  'document_title',
  'heading',
  'paragraph',
  'line',
  'word',
  'symbol',
  'list',
  'list_item',
  'caption',
  'footnote',
  'page_header',
  'page_footer',
  'page_number',
  'code',
  'other',
] as const;
export const TextRoleSchema = z.enum(TEXT_ROLES);
export type TextRole = z.infer<typeof TextRoleSchema>;

export const TEXT_BREAKS = ['none', 'space', 'wide_space', 'hyphen', 'line_break'] as const;
export const TextBreakSchema = z.enum(TEXT_BREAKS);
export type TextBreak = z.infer<typeof TextBreakSchema>;

export const TextElementSchema = z
  .object({
    ...ElementBaseShape,
    kind: z.literal('text'),
    role: TextRoleSchema,
    text: z.string(),
    spans: z.array(TextSpanSchema).default([]),
    languages: z.array(LanguageSchema).default([]),
    style: TextStyleSchema.optional(),
    break_after: TextBreakSchema.optional(),
  })
  .strict();
export type TextElement = z.infer<typeof TextElementSchema>;

export const TABLE_CELL_ROLES = [
  'body',
  'column_header',
  'row_header',
  'stub',
  'title',
  'footer',
] as const;
export const TableCellRoleSchema = z.enum(TABLE_CELL_ROLES);
export type TableCellRole = z.infer<typeof TableCellRoleSchema>;

export const TableCellSchema = z
  .object({
    id: z.string().min(1),
    row_index: z.number().int().min(0),
    column_index: z.number().int().min(0),
    row_span: z.number().int().min(1).default(1),
    column_span: z.number().int().min(1).default(1),
    role: TableCellRoleSchema.default('body'),
    text: z.string(),
    spans: z.array(TextSpanSchema).default([]),
    locations: z.array(GeometrySchema).default([]),
    confidence: ConfidenceSchema.optional(),
    source: SourceProvenanceSchema.optional(),
    element_ids: z.array(z.string().min(1)).default([]),
  })
  .strict();
export type TableCell = z.infer<typeof TableCellSchema>;

/**
 * Structured `cells` are the canonical table content when present.
 * Optional `html` / `markdown` are provider passthroughs for empty-cell fallbacks
 * and raw fidelity — shared rendering prefers cells, then html, then markdown.
 */

export const TableElementSchema = z
  .object({
    ...ElementBaseShape,
    kind: z.literal('table'),
    row_count: z.number().int().min(0),
    column_count: z.number().int().min(0),
    cells: z.array(TableCellSchema).default([]),
    html: z.string().optional(),
    markdown: z.string().optional(),
  })
  .strict()
  .superRefine((table, ctx) => {
    const cellIds = new Set<string>();
    for (const [index, cell] of table.cells.entries()) {
      if (cellIds.has(cell.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate table cell id: ${cell.id}`,
          path: ['cells', index, 'id'],
        });
      }
      cellIds.add(cell.id);
      if (
        cell.row_index + cell.row_span > table.row_count ||
        cell.column_index + cell.column_span > table.column_count
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'table cell span exceeds table dimensions',
          path: ['cells', index],
        });
      }
    }

    const { overlaps, limitsExceeded } = findOverlappingTableCellIds(table.cells, {
      stopAfterFirst: true,
    });
    if (limitsExceeded) {
      ctx.addIssue({
        code: 'custom',
        message: `table cell row coverage exceeds ${MAX_TABLE_CELL_ROW_COVERAGE}`,
        path: ['cells'],
      });
      return;
    }
    for (const [index, overlappingId] of overlaps.entries()) {
      if (overlappingId == null) continue;
      ctx.addIssue({
        code: 'custom',
        message: `table cell overlaps ${overlappingId}`,
        path: ['cells', index],
      });
      break;
    }
  });
export type TableElement = z.infer<typeof TableElementSchema>;

export const FigureElementSchema = z
  .object({
    ...ElementBaseShape,
    kind: z.literal('figure'),
    asset_id: z.string().min(1).optional(),
    caption: z.string().optional(),
    caption_spans: z.array(TextSpanSchema).default([]),
    alt_text: z.string().optional(),
  })
  .strict();
export type FigureElement = z.infer<typeof FigureElementSchema>;

export const FORMULA_FORMATS = ['latex', 'mathml', 'plain', 'unknown'] as const;
export const FormulaFormatSchema = z.enum(FORMULA_FORMATS);
export type FormulaFormat = z.infer<typeof FormulaFormatSchema>;

export const FormulaElementSchema = z
  .object({
    ...ElementBaseShape,
    kind: z.literal('formula'),
    value: z.string(),
    format: FormulaFormatSchema,
    spans: z.array(TextSpanSchema).default([]),
  })
  .strict();
export type FormulaElement = z.infer<typeof FormulaElementSchema>;

export const StructuredValueSchema = z
  .object({
    text: z.string(),
    spans: z.array(TextSpanSchema).default([]),
    element_ids: z.array(z.string().min(1)).default([]),
    locations: z.array(GeometrySchema).default([]),
    confidence: ConfidenceSchema.optional(),
  })
  .strict();
export type StructuredValue = z.infer<typeof StructuredValueSchema>;

export const KeyValueElementSchema = z
  .object({
    ...ElementBaseShape,
    kind: z.literal('key_value'),
    key: StructuredValueSchema,
    value: StructuredValueSchema,
  })
  .strict();
export type KeyValueElement = z.infer<typeof KeyValueElementSchema>;

export const QueryAnswerElementSchema = z
  .object({
    ...ElementBaseShape,
    kind: z.literal('query_answer'),
    query: StructuredValueSchema,
    answer: StructuredValueSchema.nullable(),
    alias: z.string().min(1).optional(),
  })
  .strict();
export type QueryAnswerElement = z.infer<typeof QueryAnswerElementSchema>;

export const SECTION_ROLES = ['section', 'chapter', 'group', 'other'] as const;
export const SectionRoleSchema = z.enum(SECTION_ROLES);
export type SectionRole = z.infer<typeof SectionRoleSchema>;

export const SectionElementSchema = z
  .object({
    ...ElementBaseShape,
    kind: z.literal('section'),
    role: SectionRoleSchema.default('section'),
    title: z.string().optional(),
    spans: z.array(TextSpanSchema).default([]),
  })
  .strict();
export type SectionElement = z.infer<typeof SectionElementSchema>;

export const SELECTION_STATES = ['selected', 'unselected', 'indeterminate'] as const;
export const SelectionStateSchema = z.enum(SELECTION_STATES);
export type SelectionState = z.infer<typeof SelectionStateSchema>;

export const SELECTION_MARK_TYPES = ['checkbox', 'radio', 'other'] as const;
export const SelectionMarkTypeSchema = z.enum(SELECTION_MARK_TYPES);
export type SelectionMarkType = z.infer<typeof SelectionMarkTypeSchema>;

export const SelectionMarkElementSchema = z
  .object({
    ...ElementBaseShape,
    kind: z.literal('selection_mark'),
    state: SelectionStateSchema,
    mark_type: SelectionMarkTypeSchema,
  })
  .strict();
export type SelectionMarkElement = z.infer<typeof SelectionMarkElementSchema>;

export const SignatureElementSchema = z
  .object({
    ...ElementBaseShape,
    kind: z.literal('signature'),
    text: z.string().optional(),
  })
  .strict();
export type SignatureElement = z.infer<typeof SignatureElementSchema>;

export const BarcodeElementSchema = z
  .object({
    ...ElementBaseShape,
    kind: z.literal('barcode'),
    value: z.string(),
    symbology: z.string().min(1).optional(),
  })
  .strict();
export type BarcodeElement = z.infer<typeof BarcodeElementSchema>;

export const LinkElementSchema = z
  .object({
    ...ElementBaseShape,
    kind: z.literal('link'),
    url: z.string().min(1),
    text: z.string().optional(),
    spans: z.array(TextSpanSchema).default([]),
  })
  .strict();
export type LinkElement = z.infer<typeof LinkElementSchema>;

export const StampElementSchema = z
  .object({
    ...ElementBaseShape,
    kind: z.literal('stamp'),
    text: z.string().optional(),
  })
  .strict();
export type StampElement = z.infer<typeof StampElementSchema>;

export const OtherElementSchema = z
  .object({
    ...ElementBaseShape,
    kind: z.literal('other'),
    label: z.string().min(1),
    text: z.string().optional(),
  })
  .strict();
export type OtherElement = z.infer<typeof OtherElementSchema>;

export const DOCUMENT_ELEMENT_KINDS = [
  'text',
  'table',
  'figure',
  'formula',
  'key_value',
  'query_answer',
  'section',
  'selection_mark',
  'signature',
  'barcode',
  'link',
  'stamp',
  'other',
] as const;
export const DocumentElementKindSchema = z.enum(DOCUMENT_ELEMENT_KINDS);
export type DocumentElementKind = z.infer<typeof DocumentElementKindSchema>;

export const DocumentElementSchema = z.discriminatedUnion('kind', [
  TextElementSchema,
  TableElementSchema,
  FigureElementSchema,
  FormulaElementSchema,
  KeyValueElementSchema,
  QueryAnswerElementSchema,
  SectionElementSchema,
  SelectionMarkElementSchema,
  SignatureElementSchema,
  BarcodeElementSchema,
  LinkElementSchema,
  StampElementSchema,
  OtherElementSchema,
]);
export type DocumentElement = z.infer<typeof DocumentElementSchema>;

export const RELATION_TYPES = [
  'contains',
  'precedes',
  'continuation_of',
  'caption_of',
  'footnote_of',
  'refers_to',
  'overlaps',
] as const;
export const RelationTypeSchema = z.enum(RELATION_TYPES);
export type RelationType = z.infer<typeof RelationTypeSchema>;

export const DocumentRelationSchema = z
  .object({
    type: RelationTypeSchema,
    from_id: z.string().min(1),
    to_id: z.string().min(1),
  })
  .strict();
export type DocumentRelation = z.infer<typeof DocumentRelationSchema>;

export const COORDINATE_UNITS = ['pixel', 'point', 'inch', 'normalized'] as const;
export const CoordinateUnitSchema = z.enum(COORDINATE_UNITS);
export type CoordinateUnit = z.infer<typeof CoordinateUnitSchema>;

export const PageDefectSchema = z
  .object({
    type: z.string().min(1),
    confidence: ConfidenceSchema.optional(),
  })
  .strict();
export type PageDefect = z.infer<typeof PageDefectSchema>;

export const PageMetricSchema = z
  .object({
    name: z.string().min(1),
    value: z.union([z.number().finite(), z.string(), z.boolean()]),
  })
  .strict();
export type PageMetric = z.infer<typeof PageMetricSchema>;

export const PageQualitySchema = z
  .object({
    score: ConfidenceSchema.optional(),
    defects: z.array(PageDefectSchema).default([]),
    metrics: z.array(PageMetricSchema).default([]),
  })
  .strict();
export type PageQuality = z.infer<typeof PageQualitySchema>;

export const DocumentPageSchema = z
  .object({
    number: z.number().int().min(1),
    source_page_number: z.number().int().min(1).optional(),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
    unit: CoordinateUnitSchema,
    rotation_degrees: z.number().finite().min(-360).max(360).default(0),
    languages: z.array(LanguageSchema).default([]),
    /**
     * Optional page-level recognition/detection confidence when the provider
     * reports an aggregate score for the page (distinct from {@link quality}).
     */
    confidence: ConfidenceSchema.optional(),
    /** Image/page quality signals (scores, defects, provider metrics). */
    quality: PageQualitySchema.optional(),
    image_asset_id: z.string().min(1).optional(),
    element_ids: z.array(z.string().min(1)).default([]),
    reading_order: z.array(z.string().min(1)).default([]),
  })
  .strict();
export type DocumentPage = z.infer<typeof DocumentPageSchema>;

export const ASSET_KINDS = ['page_image', 'figure', 'embedded_image', 'other'] as const;
export const AssetKindSchema = z.enum(ASSET_KINDS);
export type AssetKind = z.infer<typeof AssetKindSchema>;

export const DocumentAssetSchema = z
  .object({
    id: z.string().min(1),
    kind: AssetKindSchema,
    uri: z.string().min(1).optional(),
    data_base64: z.string().min(1).optional(),
    mime_type: z.string().min(1).optional(),
    page_number: z.number().int().min(1).optional(),
    width: z.number().finite().positive().optional(),
    height: z.number().finite().positive().optional(),
    sha256: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .optional(),
  })
  .strict()
  .superRefine((asset, ctx) => {
    if (asset.uri === undefined && asset.data_base64 === undefined) {
      ctx.addIssue({ code: 'custom', message: 'asset requires uri or data_base64' });
    }
    if ((asset.width === undefined) !== (asset.height === undefined)) {
      ctx.addIssue({
        code: 'custom',
        message: 'asset width and height must be provided together',
        path: ['width'],
      });
    }
  });
export type DocumentAsset = z.infer<typeof DocumentAssetSchema>;

export const DocumentProvenanceSchema = z
  .object({
    provider: z.string().min(1).max(128),
    model: z.string().min(1).max(128),
    version: z.string().min(1).max(256).optional(),
    operation: z.string().min(1).max(128).optional(),
  })
  .strict();
export type DocumentProvenance = z.infer<typeof DocumentProvenanceSchema>;

export const TextAnnotationSchema = z
  .object({
    id: z.string().min(1),
    spans: z.array(TextSpanSchema).min(1),
    languages: z.array(LanguageSchema).default([]),
    style: TextStyleSchema.optional(),
    confidence: ConfidenceSchema.optional(),
    source: SourceProvenanceSchema.optional(),
  })
  .strict()
  .superRefine((annotation, ctx) => {
    if (annotation.languages.length === 0 && annotation.style === undefined) {
      ctx.addIssue({ code: 'custom', message: 'text annotation requires language or style data' });
    }
  });
export type TextAnnotation = z.infer<typeof TextAnnotationSchema>;

export const ParsedDocumentSchema = z
  .object({
    output_format: z.literal('openparser@1'),
    document_id: z.string().min(1),
    provenance: DocumentProvenanceSchema,
    /** Plain reading-order text. Every span uses UTF-16 code-unit offsets into this string. */
    text: z.string(),
    /** Canonical best-effort Markdown rendering of the document graph. */
    markdown: z.string(),
    pages: z.array(DocumentPageSchema).min(1),
    elements: z.array(DocumentElementSchema).default([]),
    text_annotations: z.array(TextAnnotationSchema).default([]),
    relations: z.array(DocumentRelationSchema).default([]),
    assets: z.array(DocumentAssetSchema).default([]),
  })
  .strict()
  .superRefine((document, ctx) => {
    const textLength = document.text.length;
    const pageByNumber = new Map(document.pages.map((page) => [page.number, page]));
    for (let index = 0; index < document.pages.length; index++) {
      if (document.pages[index]?.number !== index + 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'page numbers must be contiguous and one-based',
          path: ['pages', index, 'number'],
        });
        break;
      }
    }

    const elementById = new Map<string, DocumentElement>();
    // Citations resolve against one ID namespace for elements and table cells.
    const tableCellIdPaths = new Map<string, PropertyKey[]>();
    for (const [index, element] of document.elements.entries()) {
      if (elementById.has(element.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate element id: ${element.id}`,
          path: ['elements', index, 'id'],
        });
      }
      elementById.set(element.id, element);
      validateLocations(element.locations, pageByNumber, ctx, ['elements', index, 'locations']);
      validateSpans(element, textLength, ctx, ['elements', index]);
      if (element.kind === 'table') {
        for (const [cellIndex, cell] of element.cells.entries()) {
          const cellIdPath: PropertyKey[] = ['elements', index, 'cells', cellIndex, 'id'];
          if (tableCellIdPaths.has(cell.id)) {
            ctx.addIssue({
              code: 'custom',
              message: `duplicate table cell id across document: ${cell.id}`,
              path: cellIdPath,
            });
          } else {
            tableCellIdPaths.set(cell.id, cellIdPath);
          }
          validateLocations(cell.locations, pageByNumber, ctx, [
            'elements',
            index,
            'cells',
            cellIndex,
            'locations',
          ]);
          validateTextSpans(cell.spans, textLength, ctx, [
            'elements',
            index,
            'cells',
            cellIndex,
            'spans',
          ]);
        }
      }
    }
    for (const [cellId, cellIdPath] of tableCellIdPaths) {
      if (elementById.has(cellId)) {
        ctx.addIssue({
          code: 'custom',
          message: `table cell id collides with element id: ${cellId}`,
          path: cellIdPath,
        });
      }
    }

    const assetById = new Map<string, DocumentAsset>();
    for (const [index, asset] of document.assets.entries()) {
      if (assetById.has(asset.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate asset id: ${asset.id}`,
          path: ['assets', index, 'id'],
        });
      }
      assetById.set(asset.id, asset);
      if (asset.page_number !== undefined && !pageByNumber.has(asset.page_number)) {
        ctx.addIssue({
          code: 'custom',
          message: `asset references unknown page: ${asset.page_number}`,
          path: ['assets', index, 'page_number'],
        });
      }
    }

    const annotationIds = new Set<string>();
    for (const [index, annotation] of document.text_annotations.entries()) {
      if (annotationIds.has(annotation.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate text annotation id: ${annotation.id}`,
          path: ['text_annotations', index, 'id'],
        });
      }
      annotationIds.add(annotation.id);
      validateTextSpans(annotation.spans, textLength, ctx, ['text_annotations', index, 'spans']);
    }

    for (const [index, page] of document.pages.entries()) {
      const pageElementIds = new Set(page.element_ids);
      if (page.image_asset_id !== undefined && !assetById.has(page.image_asset_id)) {
        ctx.addIssue({
          code: 'custom',
          message: `page references unknown asset: ${page.image_asset_id}`,
          path: ['pages', index, 'image_asset_id'],
        });
      }
      for (const field of ['element_ids', 'reading_order'] as const) {
        const seen = new Set<string>();
        for (const [idIndex, id] of page[field].entries()) {
          if (!elementById.has(id)) {
            ctx.addIssue({
              code: 'custom',
              message: `page references unknown element: ${id}`,
              path: ['pages', index, field, idIndex],
            });
          }
          if (seen.has(id)) {
            ctx.addIssue({
              code: 'custom',
              message: `duplicate page element reference: ${id}`,
              path: ['pages', index, field, idIndex],
            });
          }
          seen.add(id);
        }
      }
      for (const [orderIndex, id] of page.reading_order.entries()) {
        if (!pageElementIds.has(id)) {
          ctx.addIssue({
            code: 'custom',
            message: `reading order references element outside page membership: ${id}`,
            path: ['pages', index, 'reading_order', orderIndex],
          });
        }
      }
    }

    const containsChildren = new Map<string, string[]>();
    for (const [index, relation] of document.relations.entries()) {
      if (!elementById.has(relation.from_id)) {
        ctx.addIssue({
          code: 'custom',
          message: `relation references unknown element: ${relation.from_id}`,
          path: ['relations', index, 'from_id'],
        });
      }
      if (!elementById.has(relation.to_id)) {
        ctx.addIssue({
          code: 'custom',
          message: `relation references unknown element: ${relation.to_id}`,
          path: ['relations', index, 'to_id'],
        });
      }
      if (relation.from_id === relation.to_id) {
        ctx.addIssue({
          code: 'custom',
          message: 'relation cannot reference the same element twice',
          path: ['relations', index],
        });
      } else if (relation.type === 'contains') {
        const children = containsChildren.get(relation.from_id);
        if (children) {
          children.push(relation.to_id);
        } else {
          containsChildren.set(relation.from_id, [relation.to_id]);
        }
      }
    }
    if (hasContainsCycle(containsChildren)) {
      ctx.addIssue({
        code: 'custom',
        message: 'contains relations must form a DAG (cycle detected)',
        path: ['relations'],
      });
    }

    for (const [index, element] of document.elements.entries()) {
      if (element.kind === 'figure' && element.asset_id !== undefined) {
        if (!assetById.has(element.asset_id)) {
          ctx.addIssue({
            code: 'custom',
            message: `figure references unknown asset: ${element.asset_id}`,
            path: ['elements', index, 'asset_id'],
          });
        }
      }
      if (element.kind === 'table') {
        for (const [cellIndex, cell] of element.cells.entries()) {
          for (const [refIndex, id] of cell.element_ids.entries()) {
            if (!elementById.has(id)) {
              ctx.addIssue({
                code: 'custom',
                message: `table cell references unknown element: ${id}`,
                path: ['elements', index, 'cells', cellIndex, 'element_ids', refIndex],
              });
            }
          }
        }
      }
      if (element.kind === 'key_value') {
        validateStructuredRefs(element.key, elementById, ctx, ['elements', index, 'key']);
        validateStructuredRefs(element.value, elementById, ctx, ['elements', index, 'value']);
      }
      if (element.kind === 'query_answer') {
        validateStructuredRefs(element.query, elementById, ctx, ['elements', index, 'query']);
        if (element.answer !== null) {
          validateStructuredRefs(element.answer, elementById, ctx, ['elements', index, 'answer']);
        }
      }
    }
  });
export type ParsedDocument = z.infer<typeof ParsedDocumentSchema>;

/**
 * Document-structural narrowing helper: same `ParsedDocument` shape with `elements`
 * restricted to a subset of `kind` values. Does not claim optional fields are present.
 */
export type ParsedDocumentWithElementKinds<K extends DocumentElementKind> = Omit<
  ParsedDocument,
  'elements'
> & {
  elements: Array<Extract<DocumentElement, { kind: K }>>;
};

/**
 * Runtime guard that every element `kind` is in `allowedKinds`.
 * Use after `ParsedDocumentSchema.parse` when a caller must preserve a narrowed type.
 */
export function assertParsedDocumentElementKinds<K extends DocumentElementKind>(
  document: ParsedDocument,
  allowedKinds: readonly K[]
): asserts document is ParsedDocumentWithElementKinds<K> {
  const allowed = new Set<DocumentElementKind>(allowedKinds);
  for (const [index, element] of document.elements.entries()) {
    if (!allowed.has(element.kind)) {
      throw new Error(
        `element at index ${index} has kind ${element.kind}; allowed: ${allowedKinds.join(', ')}`
      );
    }
  }
}

/** Parse and narrow element kinds without widening back to the full `ParsedDocument`. */
export function parseParsedDocumentWithElementKinds<K extends DocumentElementKind>(
  value: unknown,
  allowedKinds: readonly K[]
): ParsedDocumentWithElementKinds<K> {
  const document = ParsedDocumentSchema.parse(value);
  assertParsedDocumentElementKinds(document, allowedKinds);
  return document;
}

function validateLocations(
  locations: Geometry[],
  pages: Map<number, DocumentPage>,
  ctx: z.RefinementCtx,
  path: PropertyKey[]
): void {
  for (const [index, location] of locations.entries()) {
    const page = pages.get(location.page_number);
    if (!page) {
      ctx.addIssue({
        code: 'custom',
        message: `geometry references unknown page: ${location.page_number}`,
        path: [...path, index, 'page_number'],
      });
      continue;
    }
    const points = [
      ...(location.polygon ?? []),
      ...(location.bbox
        ? [
            { x: location.bbox.left, y: location.bbox.top },
            { x: location.bbox.right, y: location.bbox.bottom },
          ]
        : []),
    ];
    if (points.some((point) => point.x > page.width || point.y > page.height)) {
      ctx.addIssue({
        code: 'custom',
        message: 'geometry exceeds page coordinate space',
        path: [...path, index],
      });
    }
  }
}

function validateTextSpans(
  spans: TextSpan[],
  textLength: number,
  ctx: z.RefinementCtx,
  path: PropertyKey[]
): void {
  for (const [index, span] of spans.entries()) {
    if (span.end > textLength) {
      ctx.addIssue({
        code: 'custom',
        message: 'text span exceeds document text',
        path: [...path, index, 'end'],
      });
    }
  }
}

function validateSpans(
  element: DocumentElement,
  textLength: number,
  ctx: z.RefinementCtx,
  path: PropertyKey[]
): void {
  if (
    element.kind === 'text' ||
    element.kind === 'formula' ||
    element.kind === 'link' ||
    element.kind === 'section'
  ) {
    validateTextSpans(element.spans, textLength, ctx, [...path, 'spans']);
  }
  if (element.kind === 'figure') {
    validateTextSpans(element.caption_spans, textLength, ctx, [...path, 'caption_spans']);
  }
  if (element.kind === 'key_value') {
    validateTextSpans(element.key.spans, textLength, ctx, [...path, 'key', 'spans']);
    validateTextSpans(element.value.spans, textLength, ctx, [...path, 'value', 'spans']);
  }
  if (element.kind === 'query_answer') {
    validateTextSpans(element.query.spans, textLength, ctx, [...path, 'query', 'spans']);
    if (element.answer !== null) {
      validateTextSpans(element.answer.spans, textLength, ctx, [...path, 'answer', 'spans']);
    }
  }
}

function validateStructuredRefs(
  value: StructuredValue,
  elements: Map<string, DocumentElement>,
  ctx: z.RefinementCtx,
  path: PropertyKey[]
): void {
  for (const [index, id] of value.element_ids.entries()) {
    if (!elements.has(id)) {
      ctx.addIssue({
        code: 'custom',
        message: `structured value references unknown element: ${id}`,
        path: [...path, 'element_ids', index],
      });
    }
  }
}

/** Kahn topological cycle check over `contains` adjacency. O(V+E). */
function hasContainsCycle(childrenByParent: Map<string, string[]>): boolean {
  const indegree = new Map<string, number>();
  for (const [parent, children] of childrenByParent) {
    if (!indegree.has(parent)) indegree.set(parent, 0);
    for (const child of children) {
      indegree.set(child, (indegree.get(child) ?? 0) + 1);
    }
  }

  const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
  let processed = 0;
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index]!;
    processed++;
    for (const child of childrenByParent.get(id) ?? []) {
      const nextDegree = indegree.get(child)! - 1;
      indegree.set(child, nextDegree);
      if (nextDegree === 0) queue.push(child);
    }
  }
  return processed !== indegree.size;
}
