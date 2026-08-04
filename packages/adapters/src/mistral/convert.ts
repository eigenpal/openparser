import type {
  Confidence,
  DocumentAsset,
  DocumentElement,
  DocumentPage,
  DocumentRelation,
  Geometry,
  TableCell,
  TextRole,
} from '@openparser/schema';
import { parseCanonicalWithCapabilities } from '../shared/parse-canonical';
import { renderCanonicalMarkdown } from '../shared/render';
import { tableCellsFromHtml } from '../shared/table';
import { MistralAdapterError } from './errors';
import { MISTRAL_OCR_OUTPUT_CAPABILITIES, type MistralOcrParsedDocument } from './output';

export type MapMistralOcrResponseInput = {
  documentId: string;
  expectedPages: number;
  payload: Record<string, unknown>;
  model?: string;
  version?: string;
};

type MistralTable = { id: string; content: string };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readPageDimensions(page: Record<string, unknown>): { width: number; height: number } {
  const dimensions = page.dimensions;
  if (!dimensions || typeof dimensions !== 'object') return { width: 1, height: 1 };
  const width = (dimensions as Record<string, unknown>).width;
  const height = (dimensions as Record<string, unknown>).height;
  if (!isFiniteNumber(width) || width <= 0 || !isFiniteNumber(height) || height <= 0) {
    return { width: 1, height: 1 };
  }
  return { width, height };
}

function hasTypedBlocks(blocks: unknown): boolean {
  return (
    Array.isArray(blocks) &&
    blocks.some(
      (block) =>
        !!block &&
        typeof block === 'object' &&
        typeof (block as Record<string, unknown>).content === 'string'
    )
  );
}

function normalizeBlocks(
  blocks: unknown[],
  plainText: string,
  width: number,
  height: number
): Array<Record<string, unknown>> {
  const usable = blocks.filter(
    (block): block is Record<string, unknown> =>
      !!block &&
      typeof block === 'object' &&
      typeof (block as Record<string, unknown>).content === 'string'
  );
  if (usable.length > 0) return usable;
  // Empty fallback when tables alone carry page content (blocks-off + native tables).
  if (!plainText.trim()) return [];
  return [
    {
      type: 'text',
      content: plainText,
      top_left_x: 0,
      top_left_y: 0,
      bottom_right_x: width,
      bottom_right_y: height,
    },
  ];
}

/**
 * Pure Mistral OCR API payload → `openparser@1` document graph.
 */
export function mapMistralOcrResponseToParsedDocument(
  input: MapMistralOcrResponseInput
): MistralOcrParsedDocument {
  const rawPages = input.payload.pages;
  if (!Array.isArray(rawPages) || rawPages.length !== input.expectedPages) {
    const actual = Array.isArray(rawPages) ? rawPages.length : 0;
    throw new MistralAdapterError(
      `Mistral OCR processed ${actual} pages; expected ${input.expectedPages}`
    );
  }

  const pageText: string[] = [];
  const pageNativeMarkdown: string[] = [];
  const pageHasTypedBlocks: boolean[] = [];
  for (const rawPage of rawPages) {
    if (
      !rawPage ||
      typeof rawPage !== 'object' ||
      typeof (rawPage as Record<string, unknown>).markdown !== 'string'
    ) {
      throw new MistralAdapterError('Mistral OCR page has no markdown');
    }
    const page = rawPage as Record<string, unknown>;
    const nativeMarkdown = String(page.markdown);
    const expandedMarkdown = substituteTableMarkdown(nativeMarkdown, readTables(page.tables));
    pageNativeMarkdown.push(expandedMarkdown);
    pageText.push(markdownToPlainText(expandedMarkdown));
    pageHasTypedBlocks.push(hasTypedBlocks(page.blocks));
  }
  const text = pageText.join('\n\n');
  if (!text.trim()) throw new MistralAdapterError('Mistral OCR returned empty content');

  const pages: DocumentPage[] = [];
  const elements: DocumentElement[] = [];
  const relations: DocumentRelation[] = [];
  const assets: DocumentAsset[] = [];

  for (let pageIndex = 0; pageIndex < rawPages.length; pageIndex++) {
    const pageNumber = pageIndex + 1;
    const page = rawPages[pageIndex] as Record<string, unknown>;
    const { width, height } = readPageDimensions(page);
    const pageElementIds: string[] = [];
    const tables = readTableEntries(page.tables);
    const claimedTableIds = new Set<string>();
    const tableElementByNativeId = new Map<string, string>();
    // Fallback synthetic block uses non-table plain text so materializing native
    // tables does not duplicate table body into a full-page text element.
    // Native markdown (with tables expanded) still backs ParsedDocument.markdown
    // when no typed blocks exist.
    const fallbackPlain = pageHasTypedBlocks[pageIndex]
      ? pageText[pageIndex]!
      : markdownToPlainText(
          stripTablePlaceholders(
            String(page.markdown),
            new Map(tables.map((t) => [t.id, t.content]))
          )
        );
    const blocks = normalizeBlocks(
      Array.isArray(page.blocks) ? page.blocks : [],
      fallbackPlain,
      width,
      height
    );

    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const block = blocks[blockIndex]!;
      const nativeType = readString(block.type) ?? 'text';
      const normalizedType = nativeType.toLowerCase();
      const id = `mistral-${pageNumber}-block-${blockIndex}`;
      const rawContent = String(block.content ?? '');
      const table = resolveTableForBlock(block, rawContent, tables, claimedTableIds);
      const tableContent = table?.content;
      const content = tableContent ?? rawContent;
      const locations = blockGeometry(block, pageNumber, width, height);
      const confidence = confidenceFromContainer(block.confidence_scores);
      const common = {
        id,
        locations,
        ...(confidence === undefined ? {} : { confidence }),
        source: {
          native_id: table?.id ?? readString(block.id) ?? `${pageNumber}:${blockIndex}`,
          native_type: 'layout_block',
          native_label: nativeType,
        },
      };

      let element: DocumentElement;
      if (normalizedType === 'table' || tableContent !== undefined) {
        const { cells, rowCount, columnCount } = content.trimStart().startsWith('<')
          ? tableCellsFromHtml(content, id)
          : parseMarkdownTable(content, id);
        element = {
          ...common,
          kind: 'table',
          row_count: rowCount,
          column_count: columnCount,
          cells,
          ...(content.trimStart().startsWith('<') ? { html: content } : { markdown: content }),
        };
      } else if (normalizedType === 'signature') {
        const plainContent = markdownToPlainText(content);
        element = {
          ...common,
          kind: 'signature',
          ...(plainContent ? { text: plainContent } : {}),
        };
      } else if (normalizedType === 'image' || normalizedType === 'figure') {
        const plainContent = markdownToPlainText(content);
        element = {
          ...common,
          kind: 'figure',
          caption_spans: [],
          ...(plainContent ? { alt_text: plainContent } : {}),
        };
      } else {
        element = {
          ...common,
          kind: 'text',
          role: mistralTextRole(normalizedType),
          text: markdownToPlainText(content),
          spans: [],
          languages: [],
        };
      }
      elements.push(element);
      pageElementIds.push(id);
      if (table) tableElementByNativeId.set(table.id, id);
    }

    materializeUnclaimedTables(
      tables,
      claimedTableIds,
      pageNumber,
      pageElementIds,
      elements,
      tableElementByNativeId
    );
    addPageEdgeText(page, 'header', 'page_header', pageNumber, pageElementIds, elements);
    addPageEdgeText(page, 'footer', 'page_footer', pageNumber, pageElementIds, elements);
    addImages(page, pageNumber, width, height, pageElementIds, elements, assets);
    addHyperlinks(page, pageNumber, width, height, pageElementIds, elements);
    const readingOrder = [...pageElementIds];
    addTableWordConfidenceElements(
      page,
      pageNumber,
      pageElementIds,
      elements,
      relations,
      tableElementByNativeId
    );
    addWordConfidenceElements(page, pageNumber, text, pageElementIds, elements);

    const pageConfidence = readPageConfidence(page.confidence_scores);
    const quality = readPageQualityExtras(page.confidence_scores);
    pages.push({
      number: pageNumber,
      source_page_number:
        readInteger(page.index) === undefined ? pageNumber : readInteger(page.index)! + 1,
      width,
      height,
      unit: width === 1 && height === 1 ? 'normalized' : 'pixel',
      rotation_degrees: 0,
      languages: [],
      ...(pageConfidence === undefined ? {} : { confidence: pageConfidence }),
      ...(quality === undefined ? {} : { quality }),
      element_ids: pageElementIds,
      reading_order: readingOrder,
    });
  }

  return parseCanonicalWithCapabilities(
    {
      output_format: 'openparser@1',
      document_id: input.documentId,
      provenance: {
        provider: 'mistral',
        model: input.model ?? readString(input.payload.model) ?? 'mistral-ocr',
        ...(input.version === undefined ? {} : { version: input.version }),
        operation: 'ocr',
      },
      text,
      markdown: pages
        .map((page, index) =>
          pageHasTypedBlocks[index]
            ? renderCanonicalMarkdown({ pages: [page], elements, relations, assets })
            : pageNativeMarkdown[index]!
        )
        .join('\n\n'),
      pages,
      elements,
      text_annotations: [],
      relations,
      assets,
    },
    MISTRAL_OCR_OUTPUT_CAPABILITIES
  );
}

function mistralTextRole(type: string): TextRole {
  if (type === 'title') return 'heading';
  if (type === 'header') return 'page_header';
  if (type === 'footer') return 'page_footer';
  if (type === 'list') return 'list';
  if (type === 'list_item') return 'list_item';
  if (type === 'footnote') return 'footnote';
  if (type === 'page_number') return 'page_number';
  return type === 'text' ? 'paragraph' : 'other';
}

function confidence(score: number, scope: Confidence['scope'] = 'recognition'): Confidence {
  return {
    score: Math.min(1, Math.max(0, score)),
    scope,
    calibrated: false,
    source_value: score,
    source_scale: 'zero_to_one',
  };
}

function confidenceFromContainer(value: unknown): Confidence | undefined {
  if (isFiniteNumber(value)) return confidence(value);
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const average = record.average_page_confidence_score ?? record.average_confidence_score;
  return isFiniteNumber(average) ? confidence(average) : undefined;
}

/** Page-level OCR recognition aggregate (`confidence_scores_granularity=page`). */
function readPageConfidence(value: unknown): Confidence | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const average = record.average_page_confidence_score ?? record.average_confidence_score;
  return isFiniteNumber(average) ? confidence(average, 'recognition') : undefined;
}

/**
 * Extra page metrics that are not the primary recognition score.
 * Image-quality defects remain on {@link DocumentPage.quality}; Mistral's
 * minimum word confidence is retained as a metric for losslessness.
 */
function readPageQualityExtras(value: unknown): DocumentPage['quality'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const minimum = record.minimum_page_confidence_score;
  if (!isFiniteNumber(minimum)) return undefined;
  return {
    defects: [],
    metrics: [{ name: 'minimum_word_confidence', value: minimum }],
  };
}

function addWordConfidenceElements(
  page: Record<string, unknown>,
  pageNumber: number,
  canonicalText: string,
  pageElementIds: string[],
  elements: DocumentElement[]
): void {
  const scores =
    page.confidence_scores && typeof page.confidence_scores === 'object'
      ? (page.confidence_scores as Record<string, unknown>).word_confidence_scores
      : undefined;
  if (!Array.isArray(scores)) return;
  for (let index = 0; index < scores.length; index++) {
    const entry = scores[index];
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const word = readString(record.text);
    const start = readInteger(record.start_index);
    const score = record.confidence;
    if (word === undefined || start === undefined || !isFiniteNumber(score)) continue;
    // Native indices target provider markdown; after plain-text normalization only emit
    // spans that validate as an exact unique match into canonical document.text.
    const spans = uniqueExactSpan(canonicalText, word);
    const id = `mistral-${pageNumber}-word-${index}`;
    elements.push({
      id,
      kind: 'text',
      role: 'word',
      text: word,
      spans,
      languages: [],
      locations: [],
      confidence: confidence(score),
      source: {
        native_id: `${pageNumber}:${start}`,
        native_type: 'word_confidence',
      },
    });
    pageElementIds.push(id);
  }
}

function addTableWordConfidenceElements(
  page: Record<string, unknown>,
  pageNumber: number,
  pageElementIds: string[],
  elements: DocumentElement[],
  relations: DocumentRelation[],
  tableElementByNativeId: Map<string, string>
): void {
  if (!Array.isArray(page.tables)) return;
  for (let tableIndex = 0; tableIndex < page.tables.length; tableIndex++) {
    const value = page.tables[tableIndex];
    if (!value || typeof value !== 'object') continue;
    const table = value as Record<string, unknown>;
    const scores = Array.isArray(table.word_confidence_scores)
      ? table.word_confidence_scores
      : table.confidence_scores && typeof table.confidence_scores === 'object'
        ? (table.confidence_scores as Record<string, unknown>).word_confidence_scores
        : undefined;
    if (!Array.isArray(scores)) continue;
    const tableNativeId = readString(table.id);
    const parentId =
      tableNativeId === undefined ? undefined : tableElementByNativeId.get(tableNativeId);
    for (let wordIndex = 0; wordIndex < scores.length; wordIndex++) {
      const rawWord = scores[wordIndex];
      if (!rawWord || typeof rawWord !== 'object') continue;
      const word = rawWord as Record<string, unknown>;
      const text = readString(word.text);
      if (text === undefined || !isFiniteNumber(word.confidence)) continue;
      const id = `mistral-${pageNumber}-table-${tableIndex}-word-${wordIndex}`;
      elements.push({
        id,
        kind: 'text',
        role: 'word',
        text,
        spans: [],
        languages: [],
        locations: [],
        confidence: confidence(word.confidence),
        source: {
          native_id: `${readString(table.id) ?? tableIndex}:${readInteger(word.start_index) ?? wordIndex}`,
          native_type: 'table_word_confidence',
        },
      });
      pageElementIds.push(id);
      if (parentId) {
        relations.push({ type: 'contains', from_id: parentId, to_id: id });
      }
    }
  }
}

function addPageEdgeText(
  page: Record<string, unknown>,
  field: 'header' | 'footer',
  role: 'page_header' | 'page_footer',
  pageNumber: number,
  pageElementIds: string[],
  elements: DocumentElement[]
): void {
  const value = readString(page[field]);
  if (!value) return;
  const id = `mistral-${pageNumber}-${field}`;
  elements.push({
    id,
    kind: 'text',
    role,
    text: value,
    spans: [],
    languages: [],
    locations: [],
    source: { native_id: `${pageNumber}:${field}`, native_type: field },
  });
  pageElementIds.push(id);
}

function addImages(
  page: Record<string, unknown>,
  pageNumber: number,
  width: number,
  height: number,
  pageElementIds: string[],
  elements: DocumentElement[],
  assets: DocumentAsset[]
): void {
  if (!Array.isArray(page.images)) return;
  for (let index = 0; index < page.images.length; index++) {
    const value = page.images[index];
    if (!value || typeof value !== 'object') continue;
    const image = value as Record<string, unknown>;
    const nativeId = readString(image.id) ?? `${pageNumber}:${index}`;
    const id = `mistral-${pageNumber}-image-${index}`;
    const base64 = readString(image.image_base64);
    const assetId = base64 ? `${id}-asset` : undefined;
    if (assetId && base64) {
      assets.push({
        id: assetId,
        kind: 'embedded_image',
        data_base64: base64,
        page_number: pageNumber,
      });
    }
    elements.push({
      id,
      kind: 'figure',
      caption_spans: [],
      locations: blockGeometry(image, pageNumber, width, height),
      ...(assetId === undefined ? {} : { asset_id: assetId }),
      ...(readString(image.image_annotation)
        ? { alt_text: readString(image.image_annotation)! }
        : {}),
      source: { native_id: nativeId, native_type: 'image' },
    });
    pageElementIds.push(id);
  }
}

function addHyperlinks(
  page: Record<string, unknown>,
  pageNumber: number,
  width: number,
  height: number,
  pageElementIds: string[],
  elements: DocumentElement[]
): void {
  if (!Array.isArray(page.hyperlinks)) return;
  for (let index = 0; index < page.hyperlinks.length; index++) {
    const value = page.hyperlinks[index];
    if (!value || typeof value !== 'object') continue;
    const link = value as Record<string, unknown>;
    const url = readString(link.url) ?? readString(link.href);
    if (!url) continue;
    const id = `mistral-${pageNumber}-link-${index}`;
    elements.push({
      id,
      kind: 'link',
      url,
      ...(readString(link.text) ? { text: readString(link.text)! } : {}),
      spans: [],
      locations: blockGeometry(link, pageNumber, width, height),
      source: {
        native_id: readString(link.id) ?? `${pageNumber}:${index}`,
        native_type: 'hyperlink',
      },
    });
    pageElementIds.push(id);
  }
}

function blockGeometry(
  block: Record<string, unknown>,
  pageNumber: number,
  width: number,
  height: number
): Geometry[] {
  const left = block.top_left_x;
  const top = block.top_left_y;
  const right = block.bottom_right_x;
  const bottom = block.bottom_right_y;
  if (
    !isFiniteNumber(left) ||
    !isFiniteNumber(top) ||
    !isFiniteNumber(right) ||
    !isFiniteNumber(bottom)
  ) {
    return [];
  }
  const boundedLeft = Math.min(Math.max(left, 0), Math.max(0, width - Number.EPSILON));
  const boundedTop = Math.min(Math.max(top, 0), Math.max(0, height - Number.EPSILON));
  const boundedRight = Math.min(Math.max(right, boundedLeft + Number.EPSILON), width);
  const boundedBottom = Math.min(Math.max(bottom, boundedTop + Number.EPSILON), height);
  return [
    {
      page_number: pageNumber,
      bbox: {
        left: boundedLeft,
        top: boundedTop,
        right: boundedRight,
        bottom: boundedBottom,
      },
    },
  ];
}

function readTables(value: unknown): Map<string, string> {
  return new Map(readTableEntries(value).map((table) => [table.id, table.content]));
}

function readTableEntries(value: unknown): MistralTable[] {
  const result: MistralTable[] = [];
  if (!Array.isArray(value)) return result;
  for (const table of value) {
    if (!table || typeof table !== 'object') continue;
    const record = table as Record<string, unknown>;
    const id = readString(record.id);
    const content = readString(record.content);
    if (id && content !== undefined) result.push({ id, content });
  }
  return result;
}

function resolveTableForBlock(
  block: Record<string, unknown>,
  rawContent: string,
  tables: MistralTable[],
  claimedTableIds: Set<string>
): MistralTable | undefined {
  const blockType = readString(block.type)?.toLowerCase();
  const referencedId = extractLinkTarget(rawContent);
  const explicitIds = [readString(block.table_id), readString(block.id), referencedId];
  let table = tables.find(
    (candidate) =>
      !claimedTableIds.has(candidate.id) &&
      explicitIds.some((explicitId) => explicitId === candidate.id)
  );
  if (!table && blockType === 'table') {
    // Prefer native id/index order for identical serialized contents.
    table = tables.find(
      (candidate) => !claimedTableIds.has(candidate.id) && candidate.content === rawContent
    );
  }
  if (!table && blockType === 'table') {
    table = tables.find((candidate) => !claimedTableIds.has(candidate.id));
  }
  if (table) claimedTableIds.add(table.id);
  return table;
}

/**
 * Emit canonical table elements for native `page.tables` entries that typed
 * layout blocks did not already claim (OCR3 / blocks-off OCR4).
 */
function materializeUnclaimedTables(
  tables: MistralTable[],
  claimedTableIds: Set<string>,
  pageNumber: number,
  pageElementIds: string[],
  elements: DocumentElement[],
  tableElementByNativeId: Map<string, string>
): void {
  for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
    const table = tables[tableIndex]!;
    if (claimedTableIds.has(table.id)) continue;
    claimedTableIds.add(table.id);
    const id = `mistral-${pageNumber}-table-${tableIndex}`;
    const content = table.content;
    const { cells, rowCount, columnCount } = content.trimStart().startsWith('<')
      ? tableCellsFromHtml(content, id)
      : parseMarkdownTable(content, id);
    elements.push({
      id,
      kind: 'table',
      row_count: rowCount,
      column_count: columnCount,
      cells,
      ...(content.trimStart().startsWith('<') ? { html: content } : { markdown: content }),
      locations: [],
      source: {
        native_id: table.id,
        native_type: 'table',
      },
    });
    pageElementIds.push(id);
    tableElementByNativeId.set(table.id, id);
  }
}

function extractLinkTarget(value: string): string {
  return /\[[^\]]*]\(([^)]+)\)/.exec(value)?.[1] ?? value;
}

function substituteTableMarkdown(markdown: string, tables: Map<string, string>): string {
  let result = markdown;
  for (const [id, content] of tables) {
    result = result.replaceAll(`[${id}](${id})`, content);
  }
  return result;
}

/** Remove native table link placeholders so fallback text does not restate table bodies. */
function stripTablePlaceholders(markdown: string, tables: Map<string, string>): string {
  let result = markdown;
  for (const id of tables.keys()) {
    result = result.replaceAll(`[${id}](${id})`, '');
  }
  return result;
}

/** Strip markdown/HTML into plain reading-order text for `ParsedDocument.text`. */
function markdownToPlainText(markdown: string): string {
  let text = markdown;
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|table|thead|tbody)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/t[dh]>/gi, ' ');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  text = text.replace(/[*_~`]+/g, '');
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

/**
 * Remap a word into canonical UTF-16 spans only when it occurs exactly once and
 * `text.slice(start, end) === word`.
 */
function uniqueExactSpan(text: string, word: string): Array<{ start: number; end: number }> {
  if (!word) return [];
  const start = text.indexOf(word);
  if (start === -1) return [];
  if (text.indexOf(word, start + 1) !== -1) return [];
  const end = start + word.length;
  if (text.slice(start, end) !== word) return [];
  return [{ start, end }];
}

function parseMarkdownTable(
  markdown: string,
  tableId: string
): { cells: TableCell[]; rowCount: number; columnCount: number } {
  const rows = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .map((line) =>
      line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim())
    )
    .filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
  const columnCount = rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  const cells: TableCell[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    for (let columnIndex = 0; columnIndex < rows[rowIndex]!.length; columnIndex++) {
      cells.push({
        id: `${tableId}-cell-${rowIndex}-${columnIndex}`,
        row_index: rowIndex,
        column_index: columnIndex,
        row_span: 1,
        column_span: 1,
        role: rowIndex === 0 ? 'column_header' : 'body',
        text: rows[rowIndex]![columnIndex]!,
        spans: [],
        locations: [],
        element_ids: [],
      });
    }
  }
  return { cells, rowCount: rows.length, columnCount };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}
