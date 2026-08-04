import type {
  Confidence,
  DocumentElement,
  DocumentPage,
  DocumentRelation,
  Geometry,
  Point,
  StructuredValue,
  TableCell,
  TextRole,
} from '@openparser/schema';
import { parseCanonicalWithCapabilities } from '../shared/parse-canonical';
import { renderCanonicalMarkdown } from '../shared/render';
import { tableCellsToHtml } from '../shared/table';
import { AwsTextractAdapterError } from './errors';
import {
  AWS_TEXTRACT_ANALYZE_OUTPUT_CAPABILITIES,
  AWS_TEXTRACT_DETECT_OUTPUT_CAPABILITIES,
  type AwsTextractAnalyzeParsedDocument,
  type AwsTextractDetectParsedDocument,
} from './output';

export type AwsTextractOperation = 'detect_document_text' | 'analyze_document';

export type AwsTextractResponse = {
  page_count: number;
  blocks: Record<string, unknown>[];
  operation?: AwsTextractOperation;
  model_version?: string;
};

export type MapAwsTextractInput = {
  documentId: string;
  response: AwsTextractResponse;
  model?: string;
};

/**
 * Pure AWS Textract Detect / Analyze → `openparser@1` document graph.
 */
export function mapAwsTextractToParsedDocument(
  input: MapAwsTextractInput
): AwsTextractDetectParsedDocument | AwsTextractAnalyzeParsedDocument {
  const { documentId, response } = input;
  if (!Number.isInteger(response.page_count) || response.page_count < 1) {
    throw new AwsTextractAdapterError('AWS Textract page_count must be positive');
  }
  if (!Array.isArray(response.blocks)) {
    throw new AwsTextractAdapterError('AWS Textract returned no blocks');
  }

  const blocksById = new Map<string, Record<string, unknown>>();
  const nativeOrder = new Map<string, number>();
  for (let index = 0; index < response.blocks.length; index++) {
    const block = response.blocks[index]!;
    const id = readString(block?.Id);
    if (id) {
      blocksById.set(id, block);
      nativeOrder.set(id, index);
    }
  }

  const elements: DocumentElement[] = [];
  const relations: DocumentRelation[] = [];
  const nativeToElement = new Map<string, string>();
  const consumedNativeIds = new Set<string>();

  addTextBlocks(response.blocks, elements, nativeToElement);
  addLayoutBlocks(response.blocks, blocksById, elements, nativeToElement);
  addTables(response.blocks, blocksById, elements, nativeToElement, consumedNativeIds);
  addKeyValues(response.blocks, blocksById, elements, nativeToElement, consumedNativeIds);
  addQueries(response.blocks, blocksById, elements, nativeToElement, consumedNativeIds);
  addSignaturesAndMarks(response.blocks, elements, nativeToElement);
  addOtherSemanticBlocks(response.blocks, blocksById, elements, nativeToElement, consumedNativeIds);
  addRelationships(response.blocks, nativeToElement, relations);

  const pages: DocumentPage[] = Array.from({ length: response.page_count }, (_, index) => {
    const number = index + 1;
    const pageElements = elements
      .filter((element) => element.locations.some((location) => location.page_number === number))
      .sort(
        (left, right) =>
          elementNativeOrder(left, nativeOrder) - elementNativeOrder(right, nativeOrder)
      );
    const layoutOrder = pageElements.filter((element) =>
      element.source?.native_type?.startsWith('LAYOUT_')
    );
    const lineOrder = pageElements.filter(
      (element) => element.kind === 'text' && element.role === 'line'
    );
    const highLevel = pageElements.filter(
      (element) =>
        !(
          element.kind === 'text' &&
          (element.role === 'word' || element.role === 'line' || element.role === 'symbol')
        )
    );
    return {
      number,
      source_page_number: number,
      width: 1,
      height: 1,
      unit: 'normalized',
      rotation_degrees: 0,
      languages: [],
      element_ids: pageElements.map((element) => element.id),
      reading_order: (layoutOrder.length > 0
        ? layoutOrder
        : lineOrder.length > 0
          ? lineOrder
          : highLevel.length > 0
            ? highLevel
            : pageElements
      ).map((element) => element.id),
    };
  });

  const pageLines = new Map<number, string[]>();
  for (const element of elements) {
    if (element.kind !== 'text' || element.role !== 'line' || !element.text) continue;
    const page = element.locations[0]?.page_number ?? 1;
    const lines = pageLines.get(page) ?? [];
    lines.push(element.text);
    pageLines.set(page, lines);
  }
  const text = [...pageLines.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, lines]) => lines.join('\n'))
    .join('\n\n');

  const operation = response.operation ?? 'analyze_document';
  const capabilities =
    operation === 'detect_document_text'
      ? AWS_TEXTRACT_DETECT_OUTPUT_CAPABILITIES
      : AWS_TEXTRACT_ANALYZE_OUTPUT_CAPABILITIES;

  return parseCanonicalWithCapabilities(
    {
      output_format: 'openparser@1',
      document_id: documentId,
      provenance: {
        provider: 'aws',
        model: input.model ?? 'textract',
        ...(response.model_version === undefined ? {} : { version: response.model_version }),
        operation,
      },
      text,
      markdown: renderCanonicalMarkdown({ pages, elements, relations }),
      pages,
      elements,
      text_annotations: [],
      relations: dedupeRelations(relations),
      assets: [],
    },
    capabilities
  );
}

function addTextBlocks(
  blocks: Record<string, unknown>[],
  elements: DocumentElement[],
  nativeToElement: Map<string, string>
): void {
  for (const block of blocks) {
    const blockType = readString(block.BlockType);
    if (blockType !== 'LINE' && blockType !== 'WORD') continue;
    const nativeId = readString(block.Id);
    const text = readString(block.Text);
    if (!nativeId || text === undefined) continue;
    const id = `aws-${nativeId}`;
    elements.push({
      id,
      kind: 'text',
      role: blockType === 'WORD' ? 'word' : 'line',
      text,
      spans: [],
      languages: [],
      ...(blockType === 'WORD'
        ? {
            style: {
              handwritten: readString(block.TextType) === 'HANDWRITING',
            },
          }
        : {}),
      locations: blockGeometry(block),
      ...(blockConfidence(block, 'recognition') === undefined
        ? {}
        : { confidence: blockConfidence(block, 'recognition')! }),
      source: {
        native_id: nativeId,
        native_type: blockType,
        ...(readString(block.TextType) ? { native_label: readString(block.TextType)! } : {}),
      },
    });
    nativeToElement.set(nativeId, id);
  }
}

function addLayoutBlocks(
  blocks: Record<string, unknown>[],
  blocksById: Map<string, Record<string, unknown>>,
  elements: DocumentElement[],
  nativeToElement: Map<string, string>
): void {
  for (const block of blocks) {
    const blockType = readString(block.BlockType);
    if (!blockType?.startsWith('LAYOUT_')) continue;
    const nativeId = readString(block.Id);
    if (!nativeId) continue;
    const id = `aws-${nativeId}`;
    const common = {
      id,
      locations: blockGeometry(block),
      ...(blockConfidence(block, 'classification') === undefined
        ? {}
        : { confidence: blockConfidence(block, 'classification')! }),
      source: {
        native_id: nativeId,
        native_type: blockType,
      },
    };
    const text = childText(block, blocksById);
    if (blockType === 'LAYOUT_FIGURE') {
      elements.push({
        ...common,
        kind: 'figure',
        caption_spans: [],
        ...(text ? { alt_text: text } : {}),
      });
    } else if (blockType === 'LAYOUT_TABLE' || blockType === 'LAYOUT_KEY_VALUE') {
      elements.push({
        ...common,
        kind: 'other',
        label: blockType.toLowerCase(),
        ...(text ? { text } : {}),
      });
    } else {
      elements.push({
        ...common,
        kind: 'text',
        role: awsLayoutRole(blockType),
        text,
        spans: [],
        languages: [],
      });
    }
    nativeToElement.set(nativeId, id);
  }
}

function addTables(
  blocks: Record<string, unknown>[],
  blocksById: Map<string, Record<string, unknown>>,
  elements: DocumentElement[],
  nativeToElement: Map<string, string>,
  consumed: Set<string>
): void {
  for (const table of blocks) {
    if (table.BlockType !== 'TABLE') continue;
    const nativeId = readString(table.Id);
    if (!nativeId) continue;
    const id = `aws-${nativeId}`;
    const directCells = relationships(table, 'CHILD')
      .map((cellId) => blocksById.get(cellId))
      .filter((cell): cell is Record<string, unknown> => !!cell && cell.BlockType === 'CELL');
    const mergedCells = relationships(table, 'MERGED_CELL')
      .map((cellId) => blocksById.get(cellId))
      .filter(
        (cell): cell is Record<string, unknown> => !!cell && cell.BlockType === 'MERGED_CELL'
      );
    const constituentIds = new Set(mergedCells.flatMap((cell) => relationships(cell, 'CHILD')));
    const nativeCells = [
      ...directCells.filter((cell) => {
        const cellId = readString(cell.Id);
        return cellId === undefined || !constituentIds.has(cellId);
      }),
      ...mergedCells,
    ];
    const cells: TableCell[] = [];
    for (let index = 0; index < nativeCells.length; index++) {
      const cell = nativeCells[index]!;
      const cellNativeId = readString(cell.Id) ?? `${nativeId}:cell:${index}`;
      const rowIndex = (readInteger(cell.RowIndex) ?? 1) - 1;
      const columnIndex = (readInteger(cell.ColumnIndex) ?? 1) - 1;
      const childIds = descendantNativeIds(cell, blocksById);
      cells.push({
        id: `aws-${cellNativeId}`,
        row_index: Math.max(0, rowIndex),
        column_index: Math.max(0, columnIndex),
        row_span: readInteger(cell.RowSpan) ?? 1,
        column_span: readInteger(cell.ColumnSpan) ?? 1,
        role: awsCellRole(cell),
        text: childText(cell, blocksById),
        spans: [],
        locations: blockGeometry(cell),
        ...(blockConfidence(cell, 'recognition') === undefined
          ? {}
          : { confidence: blockConfidence(cell, 'recognition')! }),
        source: {
          native_id: cellNativeId,
          native_type: readString(cell.BlockType) ?? 'CELL',
          ...(Array.isArray(cell.EntityTypes) && cell.EntityTypes.length > 0
            ? {
                native_label: cell.EntityTypes.filter((entry) => typeof entry === 'string').join(
                  ','
                ),
              }
            : {}),
        },
        element_ids: childIds
          .map((childId) => nativeToElement.get(childId))
          .filter((childId): childId is string => childId !== undefined),
      });
      consumed.add(cellNativeId);
    }
    const rowCount = cells.reduce(
      (maximum, cell) => Math.max(maximum, cell.row_index + cell.row_span),
      0
    );
    const columnCount = cells.reduce(
      (maximum, cell) => Math.max(maximum, cell.column_index + cell.column_span),
      0
    );
    elements.push({
      id,
      kind: 'table',
      row_count: rowCount,
      column_count: columnCount,
      cells,
      html: tableCellsToHtml(cells, rowCount),
      locations: blockGeometry(table),
      ...(blockConfidence(table, 'detection') === undefined
        ? {}
        : { confidence: blockConfidence(table, 'detection')! }),
      source: {
        native_id: nativeId,
        native_type: 'TABLE',
        ...(Array.isArray(table.EntityTypes) && table.EntityTypes.length > 0
          ? {
              native_label: table.EntityTypes.filter((entry) => typeof entry === 'string').join(
                ','
              ),
            }
          : {}),
      },
    });
    nativeToElement.set(nativeId, id);
  }
}

function addKeyValues(
  blocks: Record<string, unknown>[],
  blocksById: Map<string, Record<string, unknown>>,
  elements: DocumentElement[],
  nativeToElement: Map<string, string>,
  consumed: Set<string>
): void {
  for (const keyBlock of blocks) {
    if (keyBlock.BlockType !== 'KEY_VALUE_SET' || !hasEntityType(keyBlock, 'KEY')) continue;
    const nativeId = readString(keyBlock.Id);
    if (!nativeId) continue;
    const valueBlock = relationships(keyBlock, 'VALUE')
      .map((id) => blocksById.get(id))
      .find((candidate) => candidate?.BlockType === 'KEY_VALUE_SET');
    const id = `aws-key-value-${nativeId}`;
    const key = awsStructuredValue(keyBlock, blocksById, nativeToElement);
    const value = valueBlock
      ? awsStructuredValue(valueBlock, blocksById, nativeToElement)
      : emptyStructuredValue();
    elements.push({
      id,
      kind: 'key_value',
      key,
      value,
      locations: uniqueLocations([...key.locations, ...value.locations]),
      ...(blockConfidence(keyBlock, 'classification') === undefined
        ? {}
        : { confidence: blockConfidence(keyBlock, 'classification')! }),
      source: { native_id: nativeId, native_type: 'KEY_VALUE_SET' },
    });
    nativeToElement.set(nativeId, id);
    consumed.add(nativeId);
    const valueId = valueBlock ? readString(valueBlock.Id) : undefined;
    if (valueId) consumed.add(valueId);
  }
}

function addQueries(
  blocks: Record<string, unknown>[],
  blocksById: Map<string, Record<string, unknown>>,
  elements: DocumentElement[],
  nativeToElement: Map<string, string>,
  consumed: Set<string>
): void {
  for (const queryBlock of blocks) {
    if (queryBlock.BlockType !== 'QUERY') continue;
    const nativeId = readString(queryBlock.Id);
    if (!nativeId) continue;
    const queryRecord = isRecord(queryBlock.Query) ? queryBlock.Query : {};
    const query: StructuredValue = {
      text: readString(queryRecord.Text) ?? '',
      spans: [],
      element_ids: [],
      locations: blockGeometry(queryBlock),
    };
    const alias = readString(queryRecord.Alias);
    const answers = relationships(queryBlock, 'ANSWER')
      .map((id) => blocksById.get(id))
      .filter((answer): answer is Record<string, unknown> => answer?.BlockType === 'QUERY_RESULT');
    if (answers.length === 0) {
      const id = `aws-query-${nativeId}`;
      elements.push({
        id,
        kind: 'query_answer',
        query,
        answer: null,
        ...(alias ? { alias } : {}),
        locations: blockGeometry(queryBlock),
        source: { native_id: nativeId, native_type: 'QUERY' },
      });
      nativeToElement.set(nativeId, id);
    } else {
      for (let index = 0; index < answers.length; index++) {
        const answer = answers[index]!;
        const answerId = readString(answer.Id) ?? `${nativeId}:answer:${index}`;
        const id = `aws-query-${nativeId}-answer-${index}`;
        elements.push({
          id,
          kind: 'query_answer',
          query,
          answer: {
            text: readString(answer.Text) ?? '',
            spans: [],
            element_ids: [],
            locations: blockGeometry(answer),
            ...(blockConfidence(answer, 'answer') === undefined
              ? {}
              : { confidence: blockConfidence(answer, 'answer')! }),
          },
          ...(alias ? { alias } : {}),
          locations: uniqueLocations([...blockGeometry(queryBlock), ...blockGeometry(answer)]),
          ...(blockConfidence(answer, 'answer') === undefined
            ? {}
            : { confidence: blockConfidence(answer, 'answer')! }),
          source: { native_id: answerId, native_type: 'QUERY_RESULT' },
        });
        nativeToElement.set(index === 0 ? nativeId : `${nativeId}:${index}`, id);
        consumed.add(answerId);
      }
    }
    consumed.add(nativeId);
  }
}

function addSignaturesAndMarks(
  blocks: Record<string, unknown>[],
  elements: DocumentElement[],
  nativeToElement: Map<string, string>
): void {
  for (const block of blocks) {
    const nativeId = readString(block.Id);
    if (!nativeId) continue;
    if (block.BlockType === 'SIGNATURE') {
      const id = `aws-${nativeId}`;
      elements.push({
        id,
        kind: 'signature',
        locations: blockGeometry(block),
        ...(blockConfidence(block, 'detection') === undefined
          ? {}
          : { confidence: blockConfidence(block, 'detection')! }),
        source: { native_id: nativeId, native_type: 'SIGNATURE' },
      });
      nativeToElement.set(nativeId, id);
    } else if (block.BlockType === 'SELECTION_ELEMENT') {
      const id = `aws-${nativeId}`;
      const status = readString(block.SelectionStatus);
      elements.push({
        id,
        kind: 'selection_mark',
        state:
          status === 'SELECTED'
            ? 'selected'
            : status === 'NOT_SELECTED'
              ? 'unselected'
              : 'indeterminate',
        mark_type: 'checkbox',
        locations: blockGeometry(block),
        ...(blockConfidence(block, 'classification') === undefined
          ? {}
          : { confidence: blockConfidence(block, 'classification')! }),
        source: { native_id: nativeId, native_type: 'SELECTION_ELEMENT' },
      });
      nativeToElement.set(nativeId, id);
    }
  }
}

function addOtherSemanticBlocks(
  blocks: Record<string, unknown>[],
  blocksById: Map<string, Record<string, unknown>>,
  elements: DocumentElement[],
  nativeToElement: Map<string, string>,
  consumed: Set<string>
): void {
  for (const block of blocks) {
    const type = readString(block.BlockType);
    const nativeId = readString(block.Id);
    if (
      !type ||
      !nativeId ||
      consumed.has(nativeId) ||
      nativeToElement.has(nativeId) ||
      type === 'PAGE' ||
      type === 'CELL' ||
      type === 'MERGED_CELL' ||
      type === 'QUERY_RESULT' ||
      type === 'KEY_VALUE_SET'
    ) {
      continue;
    }
    if (type === 'TABLE_TITLE' || type === 'TABLE_FOOTER') {
      const id = `aws-${nativeId}`;
      elements.push({
        id,
        kind: 'text',
        role: type === 'TABLE_TITLE' ? 'caption' : 'footnote',
        text: childText(block, blocksById),
        spans: [],
        languages: [],
        locations: blockGeometry(block),
        ...(blockConfidence(block, 'recognition') === undefined
          ? {}
          : { confidence: blockConfidence(block, 'recognition')! }),
        source: { native_id: nativeId, native_type: type },
      });
      nativeToElement.set(nativeId, id);
      continue;
    }
    const id = `aws-${nativeId}`;
    elements.push({
      id,
      kind: 'other',
      label: type,
      ...(readString(block.Text) || childText(block, blocksById)
        ? { text: readString(block.Text) ?? childText(block, blocksById) }
        : {}),
      locations: blockGeometry(block),
      ...(blockConfidence(block, 'detection') === undefined
        ? {}
        : { confidence: blockConfidence(block, 'detection')! }),
      source: { native_id: nativeId, native_type: type },
    });
    nativeToElement.set(nativeId, id);
  }
}

function addRelationships(
  blocks: Record<string, unknown>[],
  nativeToElement: Map<string, string>,
  relations: DocumentRelation[]
): void {
  for (const block of blocks) {
    const nativeId = readString(block.Id);
    const from = nativeId ? nativeToElement.get(nativeId) : undefined;
    if (!from) continue;
    for (const childId of relationships(block, 'CHILD')) {
      const to = nativeToElement.get(childId);
      if (to && to !== from) relations.push({ type: 'contains', from_id: from, to_id: to });
    }
    for (const targetId of relationships(block, 'TABLE_TITLE')) {
      const caption = nativeToElement.get(targetId);
      if (caption && caption !== from) {
        relations.push({ type: 'caption_of', from_id: caption, to_id: from });
      }
    }
    for (const targetId of relationships(block, 'TABLE_FOOTER')) {
      const footnote = nativeToElement.get(targetId);
      if (footnote && footnote !== from) {
        relations.push({ type: 'footnote_of', from_id: footnote, to_id: from });
      }
    }
  }
}

function awsStructuredValue(
  block: Record<string, unknown>,
  blocksById: Map<string, Record<string, unknown>>,
  nativeToElement: Map<string, string>
): StructuredValue {
  return {
    text: childText(block, blocksById),
    spans: [],
    element_ids: relationships(block, 'CHILD')
      .map((id) => nativeToElement.get(id))
      .filter((id): id is string => id !== undefined),
    locations: blockGeometry(block),
    ...(blockConfidence(block, 'recognition') === undefined
      ? {}
      : { confidence: blockConfidence(block, 'recognition')! }),
  };
}

function emptyStructuredValue(): StructuredValue {
  return { text: '', spans: [], element_ids: [], locations: [] };
}

function relationships(block: Record<string, unknown>, type: string): string[] {
  if (!Array.isArray(block.Relationships)) return [];
  const ids: string[] = [];
  for (const value of block.Relationships) {
    if (!isRecord(value) || value.Type !== type || !Array.isArray(value.Ids)) continue;
    ids.push(...value.Ids.filter((id): id is string => typeof id === 'string'));
  }
  return ids;
}

function childText(
  block: Record<string, unknown>,
  blocksById: Map<string, Record<string, unknown>>,
  visited = new Set<string>()
): string {
  const parts: string[] = [];
  for (const childId of relationships(block, 'CHILD')) {
    if (visited.has(childId)) continue;
    visited.add(childId);
    const child = blocksById.get(childId);
    if (!child) continue;
    if (child.BlockType === 'WORD' && readString(child.Text)) {
      parts.push(readString(child.Text)!);
    } else if (child.BlockType === 'SELECTION_ELEMENT') {
      parts.push(child.SelectionStatus === 'SELECTED' ? '☒' : '☐');
    } else if (readString(child.Text)) {
      parts.push(readString(child.Text)!);
    } else {
      const nested = childText(child, blocksById, visited);
      if (nested) parts.push(nested);
    }
  }
  return parts.join(' ');
}

function descendantNativeIds(
  block: Record<string, unknown>,
  blocksById: Map<string, Record<string, unknown>>
): string[] {
  const result: string[] = [];
  const pending = [...relationships(block, 'CHILD')];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const id = pending.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const child = blocksById.get(id);
    if (!child) continue;
    if (child.BlockType === 'WORD' || child.BlockType === 'SELECTION_ELEMENT') {
      result.push(id);
    } else {
      pending.push(...relationships(child, 'CHILD'));
    }
  }
  return result;
}

function blockGeometry(block: Record<string, unknown>): Geometry[] {
  if (!isRecord(block.Geometry)) return [];
  const page = readInteger(block.Page) ?? 1;
  const polygon = readAwsPolygon(block.Geometry.Polygon);
  const bbox = readAwsBbox(block.Geometry.BoundingBox);
  if (!polygon && !bbox) return [];
  const resolvedBbox = bbox ?? polygonBox(polygon!);
  return [
    {
      page_number: page,
      bbox: resolvedBbox,
      ...(polygon === undefined ? {} : { polygon }),
      ...(isFiniteNumber(block.Geometry.RotationAngle)
        ? { rotation_degrees: block.Geometry.RotationAngle }
        : {}),
    },
  ];
}

function readAwsPolygon(value: unknown): Point[] | undefined {
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const points: Point[] = [];
  for (const point of value) {
    if (!isRecord(point) || !isFiniteNumber(point.X) || !isFiniteNumber(point.Y)) {
      return undefined;
    }
    points.push({ x: clamp(point.X, 0, 1), y: clamp(point.Y, 0, 1) });
  }
  return points;
}

function polygonBox(points: Point[]): Geometry['bbox'] {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  const boundedLeft = clamp(left, 0, 1 - Number.EPSILON);
  const boundedTop = clamp(top, 0, 1 - Number.EPSILON);
  return {
    left: boundedLeft,
    top: boundedTop,
    right: clamp(right, boundedLeft + Number.EPSILON, 1),
    bottom: clamp(bottom, boundedTop + Number.EPSILON, 1),
  };
}

function readAwsBbox(value: unknown): Geometry['bbox'] | undefined {
  if (!isRecord(value)) return undefined;
  const left = value.Left;
  const top = value.Top;
  const width = value.Width;
  const height = value.Height;
  if (
    !isFiniteNumber(left) ||
    !isFiniteNumber(top) ||
    !isFiniteNumber(width) ||
    !isFiniteNumber(height)
  ) {
    return undefined;
  }
  const boundedLeft = clamp(left, 0, 1 - Number.EPSILON);
  const boundedTop = clamp(top, 0, 1 - Number.EPSILON);
  const right = clamp(left + width, boundedLeft + Number.EPSILON, 1);
  const bottom = clamp(top + height, boundedTop + Number.EPSILON, 1);
  return { left: boundedLeft, top: boundedTop, right, bottom };
}

function blockConfidence(
  block: Record<string, unknown>,
  scope: Confidence['scope']
): Confidence | undefined {
  if (!isFiniteNumber(block.Confidence)) return undefined;
  return {
    score: clamp(block.Confidence / 100, 0, 1),
    scope,
    calibrated: false,
    source_value: block.Confidence,
    source_scale: 'zero_to_hundred',
  };
}

function awsLayoutRole(type: string): TextRole {
  if (type === 'LAYOUT_TITLE') return 'document_title';
  if (type === 'LAYOUT_SECTION_HEADER') return 'heading';
  if (type === 'LAYOUT_HEADER') return 'page_header';
  if (type === 'LAYOUT_FOOTER') return 'page_footer';
  if (type === 'LAYOUT_PAGE_NUMBER') return 'page_number';
  if (type === 'LAYOUT_LIST') return 'list';
  if (type === 'LAYOUT_KEY_VALUE') return 'paragraph';
  return 'paragraph';
}

function awsCellRole(cell: Record<string, unknown>): TableCell['role'] {
  if (hasEntityType(cell, 'COLUMN_HEADER')) return 'column_header';
  if (hasEntityType(cell, 'ROW_HEADER')) return 'row_header';
  if (hasEntityType(cell, 'TABLE_TITLE')) return 'title';
  if (hasEntityType(cell, 'TABLE_FOOTER')) return 'footer';
  return 'body';
}

function hasEntityType(block: Record<string, unknown>, type: string): boolean {
  return Array.isArray(block.EntityTypes) && block.EntityTypes.includes(type);
}

function elementNativeOrder(element: DocumentElement, nativeOrder: Map<string, number>): number {
  const nativeId = element.source?.native_id;
  return nativeId === undefined
    ? Number.MAX_SAFE_INTEGER
    : (nativeOrder.get(nativeId) ?? Number.MAX_SAFE_INTEGER);
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
