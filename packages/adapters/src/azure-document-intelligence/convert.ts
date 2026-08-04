import type {
  Confidence,
  DocumentElement,
  DocumentPage,
  DocumentRelation,
  Geometry,
  Point,
  StructuredValue,
  TableCell,
  TextAnnotation,
  TextRole,
  TextSpan,
  TextStyle,
} from '@openparser/schema';
import { parseCanonicalWithCapabilities } from '../shared/parse-canonical';
import { renderCanonicalMarkdown } from '../shared/render';
import { tableCellsToHtml } from '../shared/table';
import { AzureDocumentIntelligenceAdapterError } from './errors';
import { azureModelSupportsKeyValuePairs } from './options';
import {
  AZURE_DI_LAYOUT_OUTPUT_CAPABILITIES,
  AZURE_DI_READ_OUTPUT_CAPABILITIES,
  type AzureDiLayoutParsedDocument,
  type AzureDiReadParsedDocument,
} from './output';

type PageInfo = {
  outputNumber: number;
  sourceNumber: number;
  width: number;
  height: number;
  unit: DocumentPage['unit'];
  rotation: number;
};

/** Native Azure `stringIndexType` values we convert into UTF-16 code-unit spans. */
type AzureIndexUnit = 'utf16_code_unit' | 'unicode_code_point' | 'grapheme_cluster';

export type AzureDocumentIntelligenceAnalyzeResult = Record<string, unknown>;

export type MapAzureDocumentIntelligenceInput = {
  documentId: string;
  pageCount: number;
  analyzeResult: AzureDocumentIntelligenceAnalyzeResult;
  model?: string;
  version?: string;
};

/**
 * Pure Azure Document Intelligence analyze result → `openparser@1` document graph.
 */
export function mapAzureDocumentIntelligenceToParsedDocument(
  input: MapAzureDocumentIntelligenceInput
): AzureDiLayoutParsedDocument | AzureDiReadParsedDocument {
  const rawPages = input.analyzeResult.pages;
  if (!Array.isArray(rawPages) || rawPages.length !== input.pageCount) {
    const actual = Array.isArray(rawPages) ? rawPages.length : 0;
    throw new AzureDocumentIntelligenceAdapterError(
      `Azure returned ${actual} pages; expected ${input.pageCount}`
    );
  }

  const documentText = readString(input.analyzeResult.content) ?? '';
  const indexUnit = azureIndexUnit(readString(input.analyzeResult.stringIndexType));
  // Build grapheme/code-point → UTF-16 boundaries once. Rebuilding Intl.Segmenter
  // per span call was the ~30s hot path on multi-MB Read/Layout payloads.
  const spanIndex = buildUtf16SpanIndex(documentText, indexUnit);
  const pageInfo = readPages(rawPages);
  const pages: DocumentPage[] = [...pageInfo.values()]
    .sort((left, right) => left.outputNumber - right.outputNumber)
    .map((page) => ({
      number: page.outputNumber,
      source_page_number: page.sourceNumber,
      width: page.width,
      height: page.height,
      unit: page.unit,
      rotation_degrees: page.rotation,
      languages: [],
      element_ids: [],
      reading_order: [],
    }));
  const pageByNumber = new Map(pages.map((page) => [page.number, page]));
  const elements: DocumentElement[] = [];
  const relations: DocumentRelation[] = [];
  const textAnnotations: TextAnnotation[] = [];
  const nativePathToId = new Map<string, string>();

  addParagraphs(
    input.analyzeResult,
    documentText,
    indexUnit,
    spanIndex,
    pageInfo,
    elements,
    nativePathToId
  );
  addLinesAndWords(
    input.analyzeResult,
    documentText,
    indexUnit,
    spanIndex,
    pageInfo,
    elements,
    relations
  );
  addParagraphLineRelations(elements, relations);
  addTables(
    input.analyzeResult,
    documentText,
    indexUnit,
    spanIndex,
    pageInfo,
    elements,
    nativePathToId
  );
  addFigures(
    input.analyzeResult,
    documentText,
    indexUnit,
    spanIndex,
    pageInfo,
    elements,
    relations,
    nativePathToId
  );
  addKeyValues(
    input.analyzeResult,
    documentText,
    indexUnit,
    spanIndex,
    pageInfo,
    elements,
    nativePathToId
  );
  addSections(
    input.analyzeResult,
    documentText,
    indexUnit,
    spanIndex,
    elements,
    relations,
    nativePathToId
  );
  addPageFeatures(input.analyzeResult, documentText, indexUnit, spanIndex, pageInfo, elements);
  addTextAnnotations(input.analyzeResult, documentText, indexUnit, spanIndex, textAnnotations);
  addNativeRelations(input.analyzeResult, nativePathToId, relations);

  assignPageElementOrders(pages, elements);

  if (elements.length === 0 && !documentText) {
    throw new AzureDocumentIntelligenceAdapterError('Azure returned no usable content');
  }
  const canonicalText = documentText || derivePlainText(elements);
  const canonicalPages = [...pageByNumber.values()].sort(
    (left, right) => left.number - right.number
  );
  const canonicalRelations = dedupeRelations(relations);

  const capabilities =
    input.model === undefined || azureModelSupportsKeyValuePairs(input.model)
      ? AZURE_DI_LAYOUT_OUTPUT_CAPABILITIES
      : AZURE_DI_READ_OUTPUT_CAPABILITIES;

  return parseCanonicalWithCapabilities(
    {
      output_format: 'openparser@1',
      document_id: input.documentId,
      provenance: {
        provider: 'microsoft',
        model:
          input.model ?? readString(input.analyzeResult.modelId) ?? 'azure-document-intelligence',
        ...((input.version ??
          readString(input.analyzeResult.apiVersion) ??
          readString(input.analyzeResult.modelVersion)) === undefined
          ? {}
          : {
              version: (input.version ??
                readString(input.analyzeResult.apiVersion) ??
                readString(input.analyzeResult.modelVersion))!,
            }),
        operation: 'analyze_document',
      },
      text: canonicalText,
      markdown: renderCanonicalMarkdown({
        pages: canonicalPages,
        elements,
        relations: canonicalRelations,
      }),
      pages: canonicalPages,
      elements,
      text_annotations: textAnnotations,
      relations: canonicalRelations,
      assets: [],
    },
    capabilities
  );
}

function addParagraphs(
  result: AzureDocumentIntelligenceAnalyzeResult,
  documentText: string,
  indexUnit: AzureIndexUnit,
  spanIndex: Utf16SpanIndex | undefined,
  pages: Map<number, PageInfo>,
  elements: DocumentElement[],
  nativePathToId: Map<string, string>
): void {
  if (!Array.isArray(result.paragraphs)) return;
  for (let index = 0; index < result.paragraphs.length; index++) {
    const value = result.paragraphs[index];
    if (!isRecord(value)) continue;
    const id = `azure-paragraph-${index}`;
    const spans = readUtf16Spans(value.spans, documentText, indexUnit, spanIndex);
    const text = readString(value.content) ?? textFromSpans(documentText, spans);
    elements.push({
      id,
      kind: 'text',
      role: azureParagraphRole(readString(value.role)),
      text,
      spans,
      languages: [],
      locations: readBoundingRegions(value.boundingRegions, pages),
      source: {
        native_id: `/paragraphs/${index}`,
        native_type: 'paragraph',
        ...(readString(value.role) ? { native_label: readString(value.role)! } : {}),
      },
    });
    nativePathToId.set(`/paragraphs/${index}`, id);
  }
}

function addLinesAndWords(
  result: AzureDocumentIntelligenceAnalyzeResult,
  documentText: string,
  indexUnit: AzureIndexUnit,
  spanIndex: Utf16SpanIndex | undefined,
  pages: Map<number, PageInfo>,
  elements: DocumentElement[],
  relations: DocumentRelation[]
): void {
  if (!Array.isArray(result.pages)) return;
  for (const rawPage of result.pages) {
    if (!isRecord(rawPage)) continue;
    const sourcePage = readInteger(rawPage.pageNumber);
    const page = sourcePage === undefined ? undefined : pages.get(sourcePage);
    if (!page) continue;
    const lineIds: Array<{ id: string; spans: TextSpan[] }> = [];
    if (Array.isArray(rawPage.lines)) {
      for (let lineIndex = 0; lineIndex < rawPage.lines.length; lineIndex++) {
        const value = rawPage.lines[lineIndex];
        if (!isRecord(value)) continue;
        const id = `azure-page-${page.outputNumber}-line-${lineIndex}`;
        const spans = readUtf16Spans(value.spans, documentText, indexUnit, spanIndex);
        elements.push({
          id,
          kind: 'text',
          role: 'line',
          text: readString(value.content) ?? textFromSpans(documentText, spans),
          spans,
          languages: [],
          locations: polygonLocations(value.polygon, page),
          source: {
            native_id: `${sourcePage}:line:${lineIndex}`,
            native_type: 'line',
          },
        });
        lineIds.push({ id, spans });
      }
    }
    if (Array.isArray(rawPage.words)) {
      for (let wordIndex = 0; wordIndex < rawPage.words.length; wordIndex++) {
        const value = rawPage.words[wordIndex];
        if (!isRecord(value)) continue;
        const id = `azure-page-${page.outputNumber}-word-${wordIndex}`;
        const spans = readUtf16Spans(
          value.span ? [value.span] : value.spans,
          documentText,
          indexUnit,
          spanIndex
        );
        elements.push({
          id,
          kind: 'text',
          role: 'word',
          text: readString(value.content) ?? textFromSpans(documentText, spans),
          spans,
          languages: [],
          locations: polygonLocations(value.polygon, page),
          ...(isFiniteNumber(value.confidence)
            ? { confidence: confidence(value.confidence, 'recognition') }
            : {}),
          source: {
            native_id: `${sourcePage}:word:${wordIndex}`,
            native_type: 'word',
          },
        });
        const parent = lineIds.find((line) => spansInside(spans, line.spans));
        if (parent) relations.push({ type: 'contains', from_id: parent.id, to_id: id });
      }
    }
  }
}

function addParagraphLineRelations(
  elements: DocumentElement[],
  relations: DocumentRelation[]
): void {
  const paragraphs = elements.filter(
    (element) => element.kind === 'text' && element.source?.native_type === 'paragraph'
  );
  const lines = elements.filter((element) => element.kind === 'text' && element.role === 'line');
  for (const line of lines) {
    if (line.kind !== 'text') continue;
    const parent = paragraphs.find(
      (paragraph) =>
        paragraph.kind === 'text' &&
        spansInside(line.spans, paragraph.spans) &&
        line.locations.some((lineLocation) =>
          paragraph.locations.some(
            (paragraphLocation) => paragraphLocation.page_number === lineLocation.page_number
          )
        )
    );
    if (parent) {
      relations.push({ type: 'contains', from_id: parent.id, to_id: line.id });
    }
  }
}

function addTables(
  result: AzureDocumentIntelligenceAnalyzeResult,
  documentText: string,
  indexUnit: AzureIndexUnit,
  spanIndex: Utf16SpanIndex | undefined,
  pages: Map<number, PageInfo>,
  elements: DocumentElement[],
  nativePathToId: Map<string, string>
): void {
  if (!Array.isArray(result.tables)) return;
  for (let index = 0; index < result.tables.length; index++) {
    const value = result.tables[index];
    if (!isRecord(value)) continue;
    const id = `azure-table-${index}`;
    const cells = readAzureCells(
      value.cells,
      documentText,
      indexUnit,
      spanIndex,
      pages,
      id,
      nativePathToId
    );
    const rowCount =
      readInteger(value.rowCount) ??
      cells.reduce((maximum, cell) => Math.max(maximum, cell.row_index + cell.row_span), 0);
    const columnCount =
      readInteger(value.columnCount) ??
      cells.reduce((maximum, cell) => Math.max(maximum, cell.column_index + cell.column_span), 0);
    elements.push({
      id,
      kind: 'table',
      row_count: rowCount,
      column_count: columnCount,
      cells,
      html: tableCellsToHtml(cells, rowCount),
      locations: readBoundingRegions(value.boundingRegions, pages),
      source: { native_id: `/tables/${index}`, native_type: 'table' },
    });
    nativePathToId.set(`/tables/${index}`, id);
  }
}

function addKeyValues(
  result: AzureDocumentIntelligenceAnalyzeResult,
  documentText: string,
  indexUnit: AzureIndexUnit,
  spanIndex: Utf16SpanIndex | undefined,
  pages: Map<number, PageInfo>,
  elements: DocumentElement[],
  nativePathToId: Map<string, string>
): void {
  if (!Array.isArray(result.keyValuePairs)) return;
  for (let index = 0; index < result.keyValuePairs.length; index++) {
    const value = result.keyValuePairs[index];
    if (!isRecord(value) || !isRecord(value.key)) continue;
    const key = structuredValue(
      value.key,
      documentText,
      indexUnit,
      spanIndex,
      pages,
      nativePathToId
    );
    const structured = isRecord(value.value)
      ? structuredValue(value.value, documentText, indexUnit, spanIndex, pages, nativePathToId)
      : { text: '', spans: [], element_ids: [], locations: [] };
    const id = `azure-key-value-${index}`;
    elements.push({
      id,
      kind: 'key_value',
      key,
      value: structured,
      locations: uniqueLocations([...key.locations, ...structured.locations]),
      ...(isFiniteNumber(value.confidence)
        ? { confidence: confidence(value.confidence, 'classification') }
        : {}),
      source: { native_id: `/keyValuePairs/${index}`, native_type: 'key_value_pair' },
    });
    nativePathToId.set(`/keyValuePairs/${index}`, id);
  }
}

function addFigures(
  result: AzureDocumentIntelligenceAnalyzeResult,
  documentText: string,
  indexUnit: AzureIndexUnit,
  spanIndex: Utf16SpanIndex | undefined,
  pages: Map<number, PageInfo>,
  elements: DocumentElement[],
  relations: DocumentRelation[],
  nativePathToId: Map<string, string>
): void {
  if (!Array.isArray(result.figures)) return;
  for (let index = 0; index < result.figures.length; index++) {
    const value = result.figures[index];
    if (!isRecord(value)) continue;
    const id = `azure-figure-${index}`;
    const caption = isRecord(value.caption) ? value.caption : undefined;
    const captionSpans = readUtf16Spans(caption?.spans, documentText, indexUnit, spanIndex);
    elements.push({
      id,
      kind: 'figure',
      ...(caption
        ? {
            caption: readString(caption.content) ?? textFromSpans(documentText, captionSpans),
          }
        : {}),
      caption_spans: captionSpans,
      locations: readBoundingRegions(value.boundingRegions, pages),
      source: {
        native_id: readString(value.id) ?? `/figures/${index}`,
        native_type: 'figure',
      },
    });
    nativePathToId.set(`/figures/${index}`, id);
    if (Array.isArray(value.elements)) {
      for (const child of value.elements) {
        const to = typeof child === 'string' ? nativePathToId.get(child) : undefined;
        if (to) relations.push({ type: 'contains', from_id: id, to_id: to });
      }
    }
  }
}

function addSections(
  result: AzureDocumentIntelligenceAnalyzeResult,
  documentText: string,
  indexUnit: AzureIndexUnit,
  spanIndex: Utf16SpanIndex | undefined,
  elements: DocumentElement[],
  relations: DocumentRelation[],
  nativePathToId: Map<string, string>
): void {
  if (!Array.isArray(result.sections)) return;
  for (let index = 0; index < result.sections.length; index++) {
    const value = result.sections[index];
    if (!isRecord(value)) continue;
    const id = `azure-section-${index}`;
    const spans = readUtf16Spans(value.spans, documentText, indexUnit, spanIndex);
    elements.push({
      id,
      kind: 'section',
      role: 'section',
      title: textFromSpans(documentText, spans).split('\n')[0]?.slice(0, 512),
      spans,
      locations: [],
      source: { native_id: `/sections/${index}`, native_type: 'section' },
    });
    nativePathToId.set(`/sections/${index}`, id);
    if (Array.isArray(value.elements)) {
      for (const child of value.elements) {
        if (typeof child === 'string') {
          const target = nativePathToId.get(child);
          if (target) relations.push({ type: 'contains', from_id: id, to_id: target });
        }
      }
    }
  }
}

function addPageFeatures(
  result: AzureDocumentIntelligenceAnalyzeResult,
  documentText: string,
  indexUnit: AzureIndexUnit,
  spanIndex: Utf16SpanIndex | undefined,
  pages: Map<number, PageInfo>,
  elements: DocumentElement[]
): void {
  if (!Array.isArray(result.pages)) return;
  for (const rawPage of result.pages) {
    if (!isRecord(rawPage)) continue;
    const sourcePage = readInteger(rawPage.pageNumber);
    const page = sourcePage === undefined ? undefined : pages.get(sourcePage);
    if (!page) continue;
    addFormulas(rawPage.formulas, page, documentText, indexUnit, spanIndex, elements);
    addBarcodes(rawPage.barcodes, page, elements);
    addSelectionMarks(rawPage.selectionMarks, page, documentText, indexUnit, spanIndex, elements);
  }
}

function addFormulas(
  value: unknown,
  page: PageInfo,
  documentText: string,
  indexUnit: AzureIndexUnit,
  spanIndex: Utf16SpanIndex | undefined,
  elements: DocumentElement[]
): void {
  if (!Array.isArray(value)) return;
  for (let index = 0; index < value.length; index++) {
    const formula = value[index];
    if (!isRecord(formula)) continue;
    const spans = readUtf16Spans(
      formula.span ? [formula.span] : formula.spans,
      documentText,
      indexUnit,
      spanIndex
    );
    elements.push({
      id: `azure-page-${page.outputNumber}-formula-${index}`,
      kind: 'formula',
      value: readString(formula.value) ?? textFromSpans(documentText, spans),
      format: 'latex',
      spans,
      locations: polygonLocations(formula.polygon, page),
      ...(isFiniteNumber(formula.confidence)
        ? { confidence: confidence(formula.confidence, 'recognition') }
        : {}),
      source: {
        native_id: `${page.sourceNumber}:formula:${index}`,
        native_type: 'formula',
        ...(readString(formula.kind) ? { native_label: readString(formula.kind)! } : {}),
      },
    });
  }
}

function addBarcodes(value: unknown, page: PageInfo, elements: DocumentElement[]): void {
  if (!Array.isArray(value)) return;
  for (let index = 0; index < value.length; index++) {
    const barcode = value[index];
    if (!isRecord(barcode)) continue;
    elements.push({
      id: `azure-page-${page.outputNumber}-barcode-${index}`,
      kind: 'barcode',
      value: readString(barcode.value) ?? '',
      ...(readString(barcode.kind) ? { symbology: readString(barcode.kind)! } : {}),
      locations: polygonLocations(barcode.polygon, page),
      ...(isFiniteNumber(barcode.confidence)
        ? { confidence: confidence(barcode.confidence, 'recognition') }
        : {}),
      source: {
        native_id: `${page.sourceNumber}:barcode:${index}`,
        native_type: 'barcode',
      },
    });
  }
}

function addSelectionMarks(
  value: unknown,
  page: PageInfo,
  documentText: string,
  indexUnit: AzureIndexUnit,
  spanIndex: Utf16SpanIndex | undefined,
  elements: DocumentElement[]
): void {
  if (!Array.isArray(value)) return;
  for (let index = 0; index < value.length; index++) {
    const mark = value[index];
    if (!isRecord(mark)) continue;
    const spans = readUtf16Spans(
      mark.span ? [mark.span] : mark.spans,
      documentText,
      indexUnit,
      spanIndex
    );
    const state = readString(mark.state);
    const label = textFromSpans(documentText, spans);
    elements.push({
      id: `azure-page-${page.outputNumber}-selection-${index}`,
      kind: 'selection_mark',
      state:
        state === 'selected' ? 'selected' : state === 'unselected' ? 'unselected' : 'indeterminate',
      mark_type: 'checkbox',
      locations: polygonLocations(mark.polygon, page),
      ...(isFiniteNumber(mark.confidence)
        ? { confidence: confidence(mark.confidence, 'classification') }
        : {}),
      source: {
        native_id: `${page.sourceNumber}:selection:${index}`,
        native_type: 'selection_mark',
        ...(label ? { native_label: label } : {}),
      },
    });
  }
}

function addTextAnnotations(
  result: AzureDocumentIntelligenceAnalyzeResult,
  documentText: string,
  indexUnit: AzureIndexUnit,
  spanIndex: Utf16SpanIndex | undefined,
  annotations: TextAnnotation[]
): void {
  if (Array.isArray(result.styles)) {
    for (let index = 0; index < result.styles.length; index++) {
      const value = result.styles[index];
      if (!isRecord(value)) continue;
      const spans = readUtf16Spans(value.spans, documentText, indexUnit, spanIndex);
      if (spans.length === 0) continue;
      const style = readAzureStyle(value);
      if (style === undefined) continue;
      annotations.push({
        id: `azure-style-${index}`,
        spans,
        style,
        languages: [],
        ...(isFiniteNumber(value.confidence)
          ? { confidence: confidence(value.confidence, 'classification') }
          : {}),
        source: { native_id: `/styles/${index}`, native_type: 'style' },
      });
    }
  }
  if (Array.isArray(result.languages)) {
    for (let index = 0; index < result.languages.length; index++) {
      const value = result.languages[index];
      if (!isRecord(value)) continue;
      const locale = readString(value.locale);
      const spans = readUtf16Spans(value.spans, documentText, indexUnit, spanIndex);
      if (!locale || spans.length === 0) continue;
      const languageConfidence = isFiniteNumber(value.confidence)
        ? confidence(value.confidence, 'classification')
        : undefined;
      annotations.push({
        id: `azure-language-${index}`,
        spans,
        languages: [
          {
            code: locale,
            ...(languageConfidence === undefined ? {} : { confidence: languageConfidence }),
          },
        ],
        source: { native_id: `/languages/${index}`, native_type: 'language' },
      });
    }
  }
}

function addNativeRelations(
  result: AzureDocumentIntelligenceAnalyzeResult,
  paths: Map<string, string>,
  relations: DocumentRelation[]
): void {
  if (!Array.isArray(result.sections)) return;
  for (let index = 0; index < result.sections.length; index++) {
    const section = result.sections[index];
    if (!isRecord(section) || !Array.isArray(section.elements)) continue;
    const from = paths.get(`/sections/${index}`);
    if (!from) continue;
    for (const path of section.elements) {
      const to = typeof path === 'string' ? paths.get(path) : undefined;
      if (to) relations.push({ type: 'contains', from_id: from, to_id: to });
    }
  }
}

function readPages(rawPages: unknown[]): Map<number, PageInfo> {
  const sorted: Array<Omit<PageInfo, 'outputNumber'>> = [];
  for (const rawPage of rawPages) {
    if (!isRecord(rawPage)) continue;
    const sourceNumber = readInteger(rawPage.pageNumber);
    const width = rawPage.width;
    const height = rawPage.height;
    if (
      sourceNumber === undefined ||
      !isFiniteNumber(width) ||
      width <= 0 ||
      !isFiniteNumber(height) ||
      height <= 0
    ) {
      continue;
    }
    sorted.push({
      sourceNumber,
      width,
      height,
      unit: coordinateUnit(readString(rawPage.unit)),
      rotation: isFiniteNumber(rawPage.angle) ? rawPage.angle : 0,
    });
  }
  sorted.sort((left, right) => left.sourceNumber - right.sourceNumber);
  return new Map(
    sorted.map((page, index) => [page.sourceNumber, { ...page, outputNumber: index + 1 }])
  );
}

function readAzureCells(
  value: unknown,
  documentText: string,
  indexUnit: AzureIndexUnit,
  spanIndex: Utf16SpanIndex | undefined,
  pages: Map<number, PageInfo>,
  tableId: string,
  nativePathToId: Map<string, string>
): TableCell[] {
  if (!Array.isArray(value)) return [];
  const cells: TableCell[] = [];
  for (let index = 0; index < value.length; index++) {
    const cell = value[index];
    if (!isRecord(cell)) continue;
    const row = readInteger(cell.rowIndex);
    const column = readInteger(cell.columnIndex);
    if (row === undefined || column === undefined) continue;
    cells.push({
      id: `${tableId}-cell-${index}`,
      row_index: row,
      column_index: column,
      row_span: readInteger(cell.rowSpan) ?? 1,
      column_span: readInteger(cell.columnSpan) ?? 1,
      role: azureCellRole(readString(cell.kind)),
      text: readString(cell.content) ?? '',
      spans: readUtf16Spans(cell.spans, documentText, indexUnit, spanIndex),
      locations: readBoundingRegions(cell.boundingRegions, pages),
      source: {
        native_id: `${tableId}:cell:${index}`,
        native_type: 'table_cell',
        ...(readString(cell.kind) ? { native_label: readString(cell.kind)! } : {}),
      },
      element_ids: Array.isArray(cell.elements)
        ? cell.elements
            .map((entry) => (typeof entry === 'string' ? nativePathToId.get(entry) : undefined))
            .filter((entry): entry is string => entry !== undefined)
        : [],
    });
  }
  return cells;
}

function structuredValue(
  value: Record<string, unknown>,
  documentText: string,
  indexUnit: AzureIndexUnit,
  spanIndex: Utf16SpanIndex | undefined,
  pages: Map<number, PageInfo>,
  nativePathToId: Map<string, string>
): StructuredValue {
  return {
    text: readString(value.content) ?? '',
    spans: readUtf16Spans(value.spans, documentText, indexUnit, spanIndex),
    element_ids: Array.isArray(value.elements)
      ? value.elements
          .map((entry) => (typeof entry === 'string' ? nativePathToId.get(entry) : undefined))
          .filter((entry): entry is string => entry !== undefined)
      : [],
    locations: readBoundingRegions(value.boundingRegions, pages),
  };
}

function readBoundingRegions(value: unknown, pages: Map<number, PageInfo>): Geometry[] {
  if (!Array.isArray(value)) return [];
  const locations: Geometry[] = [];
  for (const region of value) {
    if (!isRecord(region)) continue;
    const sourceNumber = readInteger(region.pageNumber);
    const page = sourceNumber === undefined ? undefined : pages.get(sourceNumber);
    if (!page) continue;
    locations.push(...polygonLocations(region.polygon, page));
  }
  return locations;
}

function polygonLocations(value: unknown, page: PageInfo): Geometry[] {
  const polygon = readPolygon(value, page.width, page.height);
  if (polygon === undefined) return [];
  return [
    {
      page_number: page.outputNumber,
      polygon,
      bbox: polygonBox(polygon, page.width, page.height),
    },
  ];
}

function readPolygon(value: unknown, width: number, height: number): Point[] | undefined {
  if (!Array.isArray(value) || value.length < 6) return undefined;
  const points: Point[] = [];
  if (value.every(isFiniteNumber)) {
    if (value.length % 2 !== 0) return undefined;
    for (let index = 0; index < value.length; index += 2) {
      points.push({
        x: clamp(Number(value[index]), 0, width),
        y: clamp(Number(value[index + 1]), 0, height),
      });
    }
  } else {
    for (const rawPoint of value) {
      if (!isRecord(rawPoint) || !isFiniteNumber(rawPoint.x) || !isFiniteNumber(rawPoint.y)) {
        return undefined;
      }
      points.push({ x: clamp(rawPoint.x, 0, width), y: clamp(rawPoint.y, 0, height) });
    }
  }
  return points.length >= 3 ? points : undefined;
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

function readNativeSpans(value: unknown): TextSpan[] {
  if (!Array.isArray(value)) return [];
  const spans: TextSpan[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const offset = readInteger(entry.offset);
    const length = readInteger(entry.length);
    if (offset === undefined || length === undefined || length < 1) continue;
    spans.push({ start: offset, end: offset + length });
  }
  return spans;
}

/**
 * Convert Azure native spans into UTF-16 code-unit offsets into `text`.
 * Identity for utf16CodeUnit; maps unicodeCodePoint / textElements boundaries.
 * Pass a document-scoped `spanIndex` for non-UTF16 units so grapheme segmentation
 * is not rebuilt per word/line/paragraph.
 */
function readUtf16Spans(
  value: unknown,
  text: string,
  unit: AzureIndexUnit,
  spanIndex?: Utf16SpanIndex
): TextSpan[] {
  const native = readNativeSpans(value);
  if (native.length === 0) return [];
  if (unit === 'utf16_code_unit') {
    return native.filter(
      (span) => span.start >= 0 && span.end <= text.length && span.end > span.start
    );
  }

  const index = spanIndex ?? buildUtf16SpanIndex(text, unit);
  if (!index) return [];

  const converted: TextSpan[] = [];
  for (const span of native) {
    if (span.start < 0 || span.end > index.units.length || span.end <= span.start) continue;
    const start = index.boundaries[span.start];
    const end = index.boundaries[span.end];
    if (start === undefined || end === undefined || end <= start || end > text.length) continue;
    const expected = index.units.slice(span.start, span.end).join('');
    if (text.slice(start, end) !== expected) continue;
    converted.push({ start, end });
  }
  return converted;
}

type Utf16SpanIndex = {
  units: string[];
  boundaries: number[];
};

function buildUtf16SpanIndex(text: string, unit: AzureIndexUnit): Utf16SpanIndex | undefined {
  if (unit === 'utf16_code_unit') return undefined;
  const units =
    unit === 'unicode_code_point'
      ? Array.from(text)
      : Array.from(
          new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
          (segment) => segment.segment
        );
  const boundaries: number[] = [0];
  let utf16Offset = 0;
  for (const part of units) {
    utf16Offset += part.length;
    boundaries.push(utf16Offset);
  }
  return { units, boundaries };
}

/** Single pass over elements to fill per-page element_ids / reading_order. */
function assignPageElementOrders(pages: DocumentPage[], elements: DocumentElement[]): void {
  const locatedByPage = new Map<number, string[]>();
  const highLevelByPage = new Map<number, Array<{ id: string; start: number }>>();
  for (const page of pages) {
    locatedByPage.set(page.number, []);
    highLevelByPage.set(page.number, []);
  }

  for (const element of elements) {
    const pageNumbers = unique(element.locations.map((location) => location.page_number));
    const isLowLevel =
      element.kind === 'text' &&
      (element.role === 'word' || element.role === 'line' || element.role === 'symbol');
    const start = elementStart(element);
    for (const pageNumber of pageNumbers) {
      locatedByPage.get(pageNumber)?.push(element.id);
      if (!isLowLevel) {
        highLevelByPage.get(pageNumber)?.push({ id: element.id, start });
      }
    }
  }

  for (const page of pages) {
    const located = unique(locatedByPage.get(page.number) ?? []);
    const highLevel = unique(
      (highLevelByPage.get(page.number) ?? [])
        .sort((left, right) => left.start - right.start)
        .map((entry) => entry.id)
    );
    page.element_ids = located;
    page.reading_order = highLevel.length > 0 ? highLevel : located;
  }
}

function readAzureStyle(value: Record<string, unknown>): TextStyle | undefined {
  const style: TextStyle = {};
  if (typeof value.isHandwritten === 'boolean') style.handwritten = value.isHandwritten;
  const fontWeight = value.fontWeight;
  if (typeof value.isBold === 'boolean') style.bold = value.isBold;
  else if (typeof fontWeight === 'string') style.bold = fontWeight.toLowerCase() === 'bold';
  if (isFiniteNumber(fontWeight)) {
    style.font_weight = Math.round(fontWeight);
    style.bold = fontWeight >= 600;
  }
  if (typeof value.isItalic === 'boolean') style.italic = value.isItalic;
  else if (readString(value.fontStyle)) {
    style.italic = readString(value.fontStyle)!.toLowerCase() === 'italic';
  }
  if (typeof value.isUnderlined === 'boolean') style.underline = value.isUnderlined;
  else if (readString(value.textDecoration)) {
    style.underline = readString(value.textDecoration)!.toLowerCase().includes('underline');
  }
  const fontFamily = readString(value.similarFontFamily) ?? readString(value.fontFamily);
  if (fontFamily) style.font_family = fontFamily;
  if (isFiniteNumber(value.fontSize) && value.fontSize > 0) {
    style.font_size = value.fontSize;
    style.font_size_unit = 'point';
  }
  if (readString(value.color)) style.foreground_color = readString(value.color)!;
  if (readString(value.backgroundColor)) {
    style.background_color = readString(value.backgroundColor)!;
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

function azureParagraphRole(role: string | undefined): TextRole {
  if (role === 'title') return 'document_title';
  if (role === 'sectionHeading') return 'heading';
  if (role === 'pageHeader') return 'page_header';
  if (role === 'pageFooter') return 'page_footer';
  if (role === 'pageNumber') return 'page_number';
  if (role === 'footnote') return 'footnote';
  return 'paragraph';
}

function azureCellRole(kind: string | undefined): TableCell['role'] {
  if (kind === 'columnHeader') return 'column_header';
  if (kind === 'rowHeader') return 'row_header';
  if (kind === 'stubHead') return 'stub';
  if (kind === 'description') return 'title';
  return 'body';
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

function derivePlainText(elements: DocumentElement[]): string {
  const lines = elements.filter((element) => element.kind === 'text' && element.role === 'line');
  const selected =
    lines.length > 0
      ? lines
      : elements.filter(
          (element) =>
            element.kind === 'text' && element.role !== 'word' && element.role !== 'symbol'
        );
  return selected
    .map((element) => (element.kind === 'text' ? element.text : ''))
    .filter(Boolean)
    .join('\n');
}

function textFromSpans(text: string, spans: TextSpan[]): string {
  return spans.map((span) => text.slice(span.start, span.end)).join('');
}

function spansInside(child: TextSpan[], parent: TextSpan[]): boolean {
  if (child.length === 0 || parent.length === 0) return false;
  return child.every((span) =>
    parent.some((container) => container.start <= span.start && span.end <= container.end)
  );
}

function elementStart(element: DocumentElement): number {
  if (
    element.kind === 'text' ||
    element.kind === 'formula' ||
    element.kind === 'link' ||
    element.kind === 'section'
  ) {
    return element.spans[0]?.start ?? Number.MAX_SAFE_INTEGER;
  }
  if (element.kind === 'key_value') return element.key.spans[0]?.start ?? Number.MAX_SAFE_INTEGER;
  return Number.MAX_SAFE_INTEGER;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function uniqueLocations(locations: Geometry[]): Geometry[] {
  const seen = new Set<string>();
  return locations.filter((location) => {
    const key = JSON.stringify(location);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function coordinateUnit(value: string | undefined): DocumentPage['unit'] {
  if (value === 'pixel') return 'pixel';
  if (value === 'inch') return 'inch';
  if (value === 'point') return 'point';
  return 'normalized';
}

function azureIndexUnit(value: string | undefined): AzureIndexUnit {
  if (value === 'unicodeCodePoint') return 'unicode_code_point';
  if (value === 'utf16CodeUnit') return 'utf16_code_unit';
  return 'grapheme_cluster';
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
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}
