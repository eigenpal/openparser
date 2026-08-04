import type {
  Confidence,
  DocumentAsset,
  DocumentElement,
  DocumentPage,
  DocumentRelation,
  Geometry,
  Language,
  ParsedDocument,
  Point,
  TableCell,
  TextBreak,
  TextRole,
  TextSpan,
  TextStyle,
} from '@openparser/schema';
import { parseCanonicalWithCapabilities } from '../shared/parse-canonical';
import { renderCanonicalMarkdown } from '../shared/render';
import {
  advancePastOccupiedTableCells,
  occupyTableCellSpan,
  tableCellsToHtml,
} from '../shared/table';
import { GoogleDocumentAiAdapterError } from './errors';
import { GOOGLE_DOCAI_OCR_OUTPUT_CAPABILITIES, type GoogleDocAiOcrParsedDocument } from './output';

export type GoogleDocumentAiProcessorType = 'OCR_PROCESSOR' | 'LAYOUT_PARSER_PROCESSOR';

export type GoogleDocumentAiResponse = {
  processor_type: GoogleDocumentAiProcessorType;
  page_count: number;
  document: Record<string, unknown>;
  model?: string;
  version?: string;
};

export type MapGoogleDocumentAiInput = {
  documentId: string;
  response: GoogleDocumentAiResponse;
};

/**
 * Pure Google Document AI Enterprise OCR / Layout Parser → `openparser@1`.
 */
export function mapGoogleDocumentAiToParsedDocument(
  input: MapGoogleDocumentAiInput
): GoogleDocAiOcrParsedDocument {
  const { response } = input;
  if (!Number.isInteger(response.page_count) || response.page_count < 1) {
    throw new GoogleDocumentAiAdapterError('Google Document AI page_count must be positive');
  }
  if (!response.document || typeof response.document !== 'object') {
    throw new GoogleDocumentAiAdapterError('Google Document AI returned no document');
  }
  if (response.processor_type === 'OCR_PROCESSOR') {
    return parseCanonicalWithCapabilities(
      parsedOcrDocument(input),
      GOOGLE_DOCAI_OCR_OUTPUT_CAPABILITIES
    );
  }
  if (response.processor_type === 'LAYOUT_PARSER_PROCESSOR') {
    return parseCanonicalWithCapabilities(
      parsedLayoutDocument(input),
      GOOGLE_DOCAI_OCR_OUTPUT_CAPABILITIES
    );
  }
  throw new GoogleDocumentAiAdapterError(
    `unsupported Google Document AI processor_type: ${String(response.processor_type)}`
  );
}

function parsedOcrDocument(input: MapGoogleDocumentAiInput): ParsedDocument {
  const { documentId, response } = input;
  const documentText = readString(response.document.text) ?? '';
  const codePointToUtf16 = buildCodePointToUtf16Map(documentText);
  const rawPages = response.document.pages;
  if (!Array.isArray(rawPages)) {
    throw new GoogleDocumentAiAdapterError('Google Document AI returned no document pages');
  }

  const pages: DocumentPage[] = [];
  const elements: DocumentElement[] = [];
  const relations: DocumentRelation[] = [];
  const assets: DocumentAsset[] = [];

  for (let pageIndex = 0; pageIndex < rawPages.length; pageIndex++) {
    const value = rawPages[pageIndex];
    if (!isRecord(value)) continue;
    const pageNumber = pageIndex + 1;
    const dimensions = readGoogleDimensions(value.dimension);
    const pageElementIds: string[] = [];
    const hierarchy: Record<string, Array<{ id: string; spans: TextSpan[] }>> = {};

    for (const [field, role] of [
      ['blocks', 'paragraph'],
      ['paragraphs', 'paragraph'],
      ['lines', 'line'],
      ['tokens', 'word'],
      ['symbols', 'symbol'],
    ] as const) {
      const created = addGoogleTextLevel({
        raw: value[field],
        field,
        role,
        pageNumber,
        dimensions,
        documentText,
        codePointToUtf16,
        elements,
        pageElementIds,
      });
      hierarchy[field] = created;
    }

    relateBySpans(hierarchy.blocks ?? [], hierarchy.paragraphs ?? [], relations);
    relateBySpans(hierarchy.paragraphs ?? [], hierarchy.lines ?? [], relations);
    relateBySpans(hierarchy.lines ?? [], hierarchy.tokens ?? [], relations);
    relateBySpans(hierarchy.tokens ?? [], hierarchy.symbols ?? [], relations);

    addGoogleTables(
      value.tables,
      pageNumber,
      dimensions,
      documentText,
      codePointToUtf16,
      elements,
      pageElementIds
    );
    addGoogleVisualElements(
      value.visualElements,
      pageNumber,
      dimensions,
      documentText,
      codePointToUtf16,
      elements,
      pageElementIds
    );

    const imageAssetId = addGooglePageImage(value.image, pageNumber, dimensions, assets);
    pages.push({
      number: pageNumber,
      source_page_number: readInteger(value.pageNumber) ?? pageNumber,
      width: dimensions.width,
      height: dimensions.height,
      unit: dimensions.unit,
      rotation_degrees: orientationDegrees(
        isRecord(value.layout) ? readString(value.layout.orientation) : undefined
      ),
      languages: readLanguages(value.detectedLanguages),
      ...(readGoogleQuality(value.imageQualityScores) === undefined
        ? {}
        : { quality: readGoogleQuality(value.imageQualityScores)! }),
      ...(imageAssetId === undefined ? {} : { image_asset_id: imageAssetId }),
      element_ids: pageElementIds,
      reading_order: chooseGoogleReadingOrder(hierarchy, pageElementIds),
    });
  }

  return assembleDocument({
    documentId,
    response,
    text: documentText,
    pages,
    elements,
    relations,
    assets,
  });
}

function parsedLayoutDocument(input: MapGoogleDocumentAiInput): ParsedDocument {
  const { documentId, response } = input;
  const documentLayout = response.document.documentLayout;
  if (!isRecord(documentLayout)) {
    throw new GoogleDocumentAiAdapterError('Google Layout Parser returned no document layout');
  }
  const text = readString(response.document.text) ?? layoutTextFromBlocks(documentLayout.blocks);
  const pages: DocumentPage[] = Array.from({ length: response.page_count }, (_, index) => ({
    number: index + 1,
    source_page_number: index + 1,
    width: 1,
    height: 1,
    unit: 'normalized' as const,
    rotation_degrees: 0,
    languages: [],
    element_ids: [],
    reading_order: [],
  }));
  const elements: DocumentElement[] = [];
  const relations: DocumentRelation[] = [];
  const rawBlocks = Array.isArray(documentLayout.blocks) ? documentLayout.blocks : [];
  for (let index = 0; index < rawBlocks.length; index++) {
    addLayoutParserBlock({
      raw: rawBlocks[index],
      id: `google-layout-${index}`,
      text,
      pages,
      elements,
      relations,
    });
  }
  for (const page of pages) {
    page.element_ids = elements
      .filter((element) =>
        element.locations.some((location) => location.page_number === page.number)
      )
      .map((element) => element.id);
    page.reading_order = [...page.element_ids];
  }
  return assembleDocument({
    documentId,
    response,
    text,
    pages,
    elements,
    relations,
    assets: [],
  });
}

function assembleDocument(input: {
  documentId: string;
  response: GoogleDocumentAiResponse;
  text: string;
  pages: DocumentPage[];
  elements: DocumentElement[];
  relations: DocumentRelation[];
  assets: DocumentAsset[];
}): ParsedDocument {
  const relations = dedupeRelations(input.relations);
  return {
    output_format: 'openparser@1',
    document_id: input.documentId,
    provenance: {
      provider: 'google',
      model:
        input.response.model ??
        (input.response.processor_type === 'OCR_PROCESSOR'
          ? 'document-ai-ocr'
          : 'document-ai-layout-parser'),
      ...(input.response.version === undefined ? {} : { version: input.response.version }),
      operation: input.response.processor_type.toLowerCase(),
    },
    text: input.text,
    markdown: renderCanonicalMarkdown({
      pages: input.pages,
      elements: input.elements,
      relations,
      assets: input.assets,
    }),
    pages: input.pages,
    elements: input.elements,
    text_annotations: [],
    relations,
    assets: input.assets,
  };
}

function addGoogleTextLevel(input: {
  raw: unknown;
  field: string;
  role: TextRole;
  pageNumber: number;
  dimensions: { width: number; height: number; unit: DocumentPage['unit'] };
  documentText: string;
  codePointToUtf16: number[];
  elements: DocumentElement[];
  pageElementIds: string[];
}): Array<{ id: string; spans: TextSpan[] }> {
  if (!Array.isArray(input.raw)) return [];
  const created: Array<{ id: string; spans: TextSpan[] }> = [];
  for (let index = 0; index < input.raw.length; index++) {
    const value = input.raw[index];
    if (!isRecord(value) || !isRecord(value.layout)) continue;
    const spans = readGoogleSpans(value.layout.textAnchor, input.codePointToUtf16);
    const text = anchorText(input.documentText, spans);
    const id = `google-page-${input.pageNumber}-${input.field}-${index}`;
    input.elements.push({
      id,
      kind: 'text',
      role: input.role,
      text,
      spans,
      languages: readLanguages(value.detectedLanguages),
      ...(readGoogleStyle(value.styleInfo) === undefined
        ? {}
        : { style: readGoogleStyle(value.styleInfo)! }),
      ...(readGoogleBreak(value.detectedBreak) === undefined
        ? {}
        : { break_after: readGoogleBreak(value.detectedBreak)! }),
      locations: layoutGeometry(value.layout, input.pageNumber, input.dimensions),
      ...(readConfidence(value.layout) === undefined
        ? {}
        : { confidence: readConfidence(value.layout)! }),
      source: {
        native_id: `${input.pageNumber}:${input.field}:${index}`,
        native_type: input.field.slice(0, -1),
      },
    });
    input.pageElementIds.push(id);
    created.push({ id, spans });
  }
  return created;
}

function addGoogleTables(
  value: unknown,
  pageNumber: number,
  dimensions: { width: number; height: number; unit: DocumentPage['unit'] },
  documentText: string,
  codePointToUtf16: number[],
  elements: DocumentElement[],
  pageElementIds: string[]
): void {
  if (!Array.isArray(value)) return;
  for (let tableIndex = 0; tableIndex < value.length; tableIndex++) {
    const table = value[tableIndex];
    if (!isRecord(table)) continue;
    const id = `google-page-${pageNumber}-table-${tableIndex}`;
    const cells: TableCell[] = [];
    const occupied = new Set<string>();
    let rowIndex = 0;
    for (const [rowField, role] of [
      ['headerRows', 'column_header'],
      ['bodyRows', 'body'],
    ] as const) {
      const rows = table[rowField];
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (!isRecord(row) || !Array.isArray(row.cells)) {
          rowIndex++;
          continue;
        }
        let columnIndex = 0;
        for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex++) {
          const cell = row.cells[cellIndex];
          if (!isRecord(cell) || !isRecord(cell.layout)) continue;
          columnIndex = advancePastOccupiedTableCells(occupied, rowIndex, columnIndex);
          const spans = readGoogleSpans(cell.layout.textAnchor, codePointToUtf16);
          const columnSpan = readInteger(cell.colSpan) ?? 1;
          const rowSpan = readInteger(cell.rowSpan) ?? 1;
          occupyTableCellSpan(occupied, rowIndex, columnIndex, rowSpan, columnSpan);
          cells.push({
            id: `${id}-cell-${rowIndex}-${cellIndex}`,
            row_index: rowIndex,
            column_index: columnIndex,
            row_span: rowSpan,
            column_span: columnSpan,
            role,
            text: anchorText(documentText, spans),
            spans,
            locations: layoutGeometry(cell.layout, pageNumber, dimensions),
            ...(readConfidence(cell.layout) === undefined
              ? {}
              : { confidence: readConfidence(cell.layout)! }),
            source: {
              native_id: `${pageNumber}:table:${tableIndex}:cell:${rowIndex}:${cellIndex}`,
              native_type: 'table_cell',
            },
            element_ids: [],
          });
          columnIndex += columnSpan;
        }
        rowIndex++;
      }
    }
    const columnCount = cells.reduce(
      (maximum, cell) => Math.max(maximum, cell.column_index + cell.column_span),
      0
    );
    elements.push({
      id,
      kind: 'table',
      row_count: rowIndex,
      column_count: columnCount,
      cells,
      html: tableCellsToHtml(cells, rowIndex),
      locations: isRecord(table.layout) ? layoutGeometry(table.layout, pageNumber, dimensions) : [],
      source: {
        native_id: `${pageNumber}:table:${tableIndex}`,
        native_type: 'table',
      },
    });
    pageElementIds.push(id);
  }
}

function addGoogleVisualElements(
  value: unknown,
  pageNumber: number,
  dimensions: { width: number; height: number; unit: DocumentPage['unit'] },
  documentText: string,
  codePointToUtf16: number[],
  elements: DocumentElement[],
  pageElementIds: string[]
): void {
  if (!Array.isArray(value)) return;
  for (let index = 0; index < value.length; index++) {
    const visual = value[index];
    if (!isRecord(visual)) continue;
    const layout = isRecord(visual.layout) ? visual.layout : undefined;
    const spans = readGoogleSpans(layout?.textAnchor, codePointToUtf16);
    const nativeType = readString(visual.type) ?? 'visual_element';
    const id = `google-page-${pageNumber}-visual-${index}`;
    const common = {
      id,
      locations: layout ? layoutGeometry(layout, pageNumber, dimensions) : [],
      ...(layout && readConfidence(layout) !== undefined
        ? { confidence: readConfidence(layout)! }
        : {}),
      source: {
        native_id: `${pageNumber}:visual:${index}`,
        native_type: nativeType,
      },
    };
    const normalized = nativeType.toLowerCase();
    if (normalized.includes('formula') || normalized.includes('math')) {
      elements.push({
        ...common,
        kind: 'formula',
        value: anchorText(documentText, spans),
        format: 'plain',
        spans,
      });
    } else if (normalized.includes('selection') || normalized.includes('checkbox')) {
      const nativeState = (
        readString(visual.state) ??
        readString(visual.detectedState) ??
        ''
      ).toLowerCase();
      const state =
        normalized.includes('unfilled') || nativeState === 'unselected'
          ? 'unselected'
          : normalized.includes('filled') || nativeState === 'selected'
            ? 'selected'
            : 'indeterminate';
      elements.push({
        ...common,
        kind: 'selection_mark',
        state,
        mark_type: normalized.includes('radio') ? 'radio' : 'checkbox',
      });
    } else {
      elements.push({
        ...common,
        kind: 'other',
        label: nativeType,
        ...(anchorText(documentText, spans) ? { text: anchorText(documentText, spans) } : {}),
      });
    }
    pageElementIds.push(id);
  }
}

function addGooglePageImage(
  value: unknown,
  pageNumber: number,
  dimensions: { width: number; height: number; unit: DocumentPage['unit'] },
  assets: DocumentAsset[]
): string | undefined {
  if (!isRecord(value)) return undefined;
  const data = readString(value.content);
  if (!data) return undefined;
  const id = `google-page-${pageNumber}-image`;
  assets.push({
    id,
    kind: 'page_image',
    data_base64: data,
    ...(readString(value.mimeType) ? { mime_type: readString(value.mimeType)! } : {}),
    page_number: pageNumber,
    width: isFiniteNumber(value.width) && value.width > 0 ? value.width : dimensions.width,
    height: isFiniteNumber(value.height) && value.height > 0 ? value.height : dimensions.height,
  });
  return id;
}

function addLayoutParserBlock(input: {
  raw: unknown;
  id: string;
  text: string;
  pages: DocumentPage[];
  elements: DocumentElement[];
  relations: DocumentRelation[];
}): string | undefined {
  if (!isRecord(input.raw)) return undefined;
  const location = layoutParserLocation(input.raw);
  const page = location?.page_number ?? 1;
  const source = {
    native_id: input.id,
    native_type: 'layout_block',
  };
  if (isRecord(input.raw.textBlock)) {
    const value = readString(input.raw.textBlock.text) ?? layoutTextFromBlocks(input.raw.blocks);
    input.elements.push({
      id: input.id,
      kind: 'text',
      role: 'paragraph',
      text: value,
      spans: [],
      languages: [],
      locations: location ? [location] : [],
      source,
    });
  } else if (isRecord(input.raw.tableBlock)) {
    const cells = layoutParserCells(input.raw.tableBlock, input.id);
    const rowCount = cells.reduce(
      (maximum, cell) => Math.max(maximum, cell.row_index + cell.row_span),
      0
    );
    const columnCount = cells.reduce(
      (maximum, cell) => Math.max(maximum, cell.column_index + cell.column_span),
      0
    );
    input.elements.push({
      id: input.id,
      kind: 'table',
      row_count: rowCount,
      column_count: columnCount,
      cells,
      html: tableCellsToHtml(cells, rowCount),
      locations: location ? [location] : [],
      source,
    });
  } else if (isRecord(input.raw.listBlock)) {
    input.elements.push({
      id: input.id,
      kind: 'text',
      role: 'list',
      text: layoutTextFromBlocks(input.raw.listBlock.listEntries),
      spans: [],
      languages: [],
      locations: location ? [location] : [],
      source,
    });
  } else {
    const text = layoutTextFromBlocks(input.raw.blocks);
    input.elements.push({
      id: input.id,
      kind: 'other',
      label: 'layout_block',
      ...(text ? { text } : {}),
      locations: location ? [location] : [],
      source,
    });
  }
  const outputPage = input.pages.find((candidate) => candidate.number === page);
  if (outputPage) {
    outputPage.element_ids.push(input.id);
    outputPage.reading_order.push(input.id);
  }
  if (Array.isArray(input.raw.blocks)) {
    for (let index = 0; index < input.raw.blocks.length; index++) {
      const childId = `${input.id}-child-${index}`;
      if (
        addLayoutParserBlock({
          ...input,
          raw: input.raw.blocks[index],
          id: childId,
        })
      ) {
        input.relations.push({ type: 'contains', from_id: input.id, to_id: childId });
      }
    }
  }
  return input.id;
}

function layoutParserCells(table: Record<string, unknown>, tableId: string): TableCell[] {
  const cells: TableCell[] = [];
  const occupied = new Set<string>();
  let rowIndex = 0;
  for (const [field, role] of [
    ['headerRows', 'column_header'],
    ['bodyRows', 'body'],
  ] as const) {
    const rows = table[field];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!isRecord(row) || !Array.isArray(row.cells)) {
        rowIndex++;
        continue;
      }
      let columnIndex = 0;
      for (let index = 0; index < row.cells.length; index++) {
        const cell = row.cells[index];
        if (!isRecord(cell)) continue;
        columnIndex = advancePastOccupiedTableCells(occupied, rowIndex, columnIndex);
        const columnSpan = readInteger(cell.colSpan) ?? 1;
        const rowSpan = readInteger(cell.rowSpan) ?? 1;
        occupyTableCellSpan(occupied, rowIndex, columnIndex, rowSpan, columnSpan);
        cells.push({
          id: `${tableId}-cell-${rowIndex}-${index}`,
          row_index: rowIndex,
          column_index: columnIndex,
          row_span: rowSpan,
          column_span: columnSpan,
          role,
          text: layoutTextFromBlocks(cell.blocks),
          spans: [],
          locations: [],
          element_ids: [],
          source: {
            native_id: `${tableId}:cell:${rowIndex}:${index}`,
            native_type: 'table_cell',
          },
        });
        columnIndex += columnSpan;
      }
      rowIndex++;
    }
  }
  return cells;
}

function layoutParserLocation(block: Record<string, unknown>): Geometry | undefined {
  const pageSpan = block.pageSpan;
  const pageNumber = isRecord(pageSpan) ? readInteger(pageSpan.pageStart) : undefined;
  if (pageNumber === undefined || !isRecord(block.boundingBox)) return undefined;
  const polygon = googlePolygon(block.boundingBox, { width: 1, height: 1, unit: 'normalized' });
  if (polygon === undefined) return undefined;
  return { page_number: pageNumber, polygon, bbox: polygonBox(polygon, 1, 1) };
}

function layoutGeometry(
  layout: Record<string, unknown>,
  pageNumber: number,
  dimensions: { width: number; height: number; unit: DocumentPage['unit'] }
): Geometry[] {
  if (!isRecord(layout.boundingPoly)) return [];
  const polygon = googlePolygon(layout.boundingPoly, dimensions);
  if (polygon === undefined) return [];
  return [
    {
      page_number: pageNumber,
      polygon,
      bbox: polygonBox(polygon, dimensions.width, dimensions.height),
      rotation_degrees: orientationDegrees(readString(layout.orientation)),
    },
  ];
}

function googlePolygon(
  poly: Record<string, unknown>,
  dimensions: { width: number; height: number; unit: DocumentPage['unit'] }
): Point[] | undefined {
  const pixels = Array.isArray(poly.vertices) ? poly.vertices : undefined;
  const normalized = Array.isArray(poly.normalizedVertices) ? poly.normalizedVertices : undefined;
  const vertices = pixels && pixels.length >= 3 ? pixels : normalized;
  if (!vertices || vertices.length < 3) return undefined;
  const useNormalized = vertices === normalized;
  const points: Point[] = [];
  for (const value of vertices) {
    if (!isRecord(value)) return undefined;
    const rawX = isFiniteNumber(value.x) ? value.x : 0;
    const rawY = isFiniteNumber(value.y) ? value.y : 0;
    points.push({
      x: clamp(useNormalized ? rawX * dimensions.width : rawX, 0, dimensions.width),
      y: clamp(useNormalized ? rawY * dimensions.height : rawY, 0, dimensions.height),
    });
  }
  return points;
}

/**
 * Google TextSegment indices are Unicode code-point offsets into Document.text.
 * Build one map of code-point index → UTF-16 code-unit offset for the whole document.
 */
function buildCodePointToUtf16Map(text: string): number[] {
  const map = [0];
  let utf16Offset = 0;
  for (const codePoint of text) {
    utf16Offset += codePoint.length;
    map.push(utf16Offset);
  }
  return map;
}

function readGoogleSpans(value: unknown, codePointToUtf16: number[]): TextSpan[] {
  const anchor = isRecord(value) ? value : undefined;
  const segments = anchor?.textSegments;
  if (!Array.isArray(segments)) return [];
  const maxCodePoint = codePointToUtf16.length - 1;
  const spans: TextSpan[] = [];
  for (const segment of segments) {
    if (!isRecord(segment)) continue;
    const start = Number(segment.startIndex ?? 0);
    const end = Number(segment.endIndex);
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end <= start ||
      end > maxCodePoint
    ) {
      continue;
    }
    const utf16Start = codePointToUtf16[start];
    const utf16End = codePointToUtf16[end];
    if (
      utf16Start === undefined ||
      utf16End === undefined ||
      utf16End <= utf16Start ||
      utf16End > codePointToUtf16[maxCodePoint]!
    ) {
      continue;
    }
    spans.push({ start: utf16Start, end: utf16End });
  }
  return spans;
}

function anchorText(text: string, spans: TextSpan[]): string {
  return spans.map((span) => text.slice(span.start, span.end)).join('');
}

function readConfidence(layout: Record<string, unknown>): Confidence | undefined {
  if (!isFiniteNumber(layout.confidence)) return undefined;
  return confidence(layout.confidence, 'recognition');
}

function confidence(score: number, scope: Confidence['scope']): Confidence {
  return {
    score: clamp(score, 0, 1),
    scope,
    calibrated: false,
    source_value: score,
    source_scale: 'zero_to_one',
  };
}

function readLanguages(value: unknown): Language[] {
  if (!Array.isArray(value)) return [];
  const languages: Language[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const code = readString(entry.languageCode);
    if (!code) continue;
    languages.push({
      code,
      ...(isFiniteNumber(entry.confidence)
        ? { confidence: confidence(entry.confidence, 'classification') }
        : {}),
    });
  }
  return languages;
}

function readGoogleStyle(value: unknown): TextStyle | undefined {
  if (!isRecord(value)) return undefined;
  const style: TextStyle = {};
  if (readString(value.fontType)) style.font_family = readString(value.fontType)!;
  if (isFiniteNumber(value.fontSize) && value.fontSize > 0) {
    style.font_size = value.fontSize;
    style.font_size_unit = 'point';
  } else if (isFiniteNumber(value.pixelFontSize) && value.pixelFontSize > 0) {
    style.font_size = value.pixelFontSize;
    style.font_size_unit = 'pixel';
  }
  if (isFiniteNumber(value.fontWeight)) style.font_weight = Math.round(value.fontWeight);
  if (typeof value.bold === 'boolean') style.bold = value.bold;
  if (typeof value.italic === 'boolean') style.italic = value.italic;
  if (typeof value.underlined === 'boolean') style.underline = value.underlined;
  if (typeof value.handwritten === 'boolean') style.handwritten = value.handwritten;
  if (isRecord(value.textColor)) style.foreground_color = colorString(value.textColor);
  if (isRecord(value.backgroundColor)) style.background_color = colorString(value.backgroundColor);
  return Object.keys(style).length > 0 ? style : undefined;
}

function readGoogleBreak(value: unknown): TextBreak | undefined {
  if (!isRecord(value)) return undefined;
  const type = readString(value.type);
  if (type === 'SPACE') return 'space';
  if (type === 'WIDE_SPACE') return 'wide_space';
  if (type === 'HYPHEN') return 'hyphen';
  if (type === 'LINE_BREAK') return 'line_break';
  return type ? 'none' : undefined;
}

function readGoogleQuality(value: unknown): DocumentPage['quality'] | undefined {
  if (!isRecord(value)) return undefined;
  const score = isFiniteNumber(value.qualityScore)
    ? confidence(value.qualityScore, 'quality')
    : undefined;
  const defects = Array.isArray(value.detectedDefects)
    ? value.detectedDefects.filter(isRecord).map((defect) => ({
        type: readString(defect.type) ?? 'unknown',
        ...(isFiniteNumber(defect.confidence)
          ? { confidence: confidence(defect.confidence, 'quality') }
          : {}),
      }))
    : [];
  if (score === undefined && defects.length === 0) return undefined;
  return { ...(score === undefined ? {} : { score }), defects, metrics: [] };
}

function readGoogleDimensions(value: unknown): {
  width: number;
  height: number;
  unit: DocumentPage['unit'];
} {
  if (!isRecord(value)) return { width: 1, height: 1, unit: 'normalized' };
  const width = isFiniteNumber(value.width) && value.width > 0 ? value.width : 1;
  const height = isFiniteNumber(value.height) && value.height > 0 ? value.height : 1;
  const unit = readString(value.unit)?.toLowerCase();
  return {
    width,
    height,
    unit:
      unit === 'pixels' || unit === 'pixel' ? 'pixel' : unit === 'point' ? 'point' : 'normalized',
  };
}

function chooseGoogleReadingOrder(
  hierarchy: Record<string, Array<{ id: string; spans: TextSpan[] }>>,
  all: string[]
): string[] {
  for (const field of ['blocks', 'paragraphs', 'lines']) {
    const ids = hierarchy[field]?.map((entry) => entry.id) ?? [];
    if (ids.length > 0) return ids;
  }
  return [...all];
}

function relateBySpans(
  parents: Array<{ id: string; spans: TextSpan[] }>,
  children: Array<{ id: string; spans: TextSpan[] }>,
  relations: DocumentRelation[]
): void {
  for (const child of children) {
    const parent = parents.find((candidate) => spansInside(child.spans, candidate.spans));
    if (parent) relations.push({ type: 'contains', from_id: parent.id, to_id: child.id });
  }
}

function spansInside(child: TextSpan[], parent: TextSpan[]): boolean {
  if (child.length === 0 || parent.length === 0) return false;
  return child.every((span) =>
    parent.some((container) => container.start <= span.start && span.end <= container.end)
  );
}

function polygonBox(points: Point[], width: number, height: number): Geometry['bbox'] {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  let left = Math.min(...xs);
  let top = Math.min(...ys);
  let right = Math.max(...xs);
  let bottom = Math.max(...ys);
  if (right <= left) {
    if (right >= width) left = Math.max(0, width - Number.EPSILON);
    else right = Math.min(width, left + Number.EPSILON);
  }
  if (bottom <= top) {
    if (bottom >= height) top = Math.max(0, height - Number.EPSILON);
    else bottom = Math.min(height, top + Number.EPSILON);
  }
  return { left, top, right, bottom };
}

function layoutTextFromBlocks(value: unknown): string {
  if (!Array.isArray(value)) return '';
  const parts: string[] = [];
  for (const block of value) {
    if (!isRecord(block)) continue;
    if (isRecord(block.textBlock) && readString(block.textBlock.text)) {
      parts.push(readString(block.textBlock.text)!);
    }
    const nested = layoutTextFromBlocks(block.blocks);
    if (nested) parts.push(nested);
    if (isRecord(block.listBlock)) {
      const list = layoutTextFromBlocks(block.listBlock.listEntries);
      if (list) parts.push(list);
    }
  }
  return parts.join('\n').trim();
}

function orientationDegrees(value: string | undefined): number {
  if (value === 'PAGE_RIGHT') return 90;
  if (value === 'PAGE_DOWN') return 180;
  if (value === 'PAGE_LEFT') return 270;
  return 0;
}

function colorString(value: Record<string, unknown>): string {
  const red = isFiniteNumber(value.red) ? Math.round(clamp(value.red, 0, 1) * 255) : 0;
  const green = isFiniteNumber(value.green) ? Math.round(clamp(value.green, 0, 1) * 255) : 0;
  const blue = isFiniteNumber(value.blue) ? Math.round(clamp(value.blue, 0, 1) * 255) : 0;
  const alpha = isFiniteNumber(value.alpha) ? clamp(value.alpha, 0, 1) : 1;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function dedupeRelations(relations: DocumentRelation[]): DocumentRelation[] {
  const seen = new Set<string>();
  return relations.filter((relation) => {
    const key = `${relation.type}\0${relation.from_id}\0${relation.to_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readInteger(value: unknown): number | undefined {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isInteger(number) ? number : undefined;
}
