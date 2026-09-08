import type {
  DocumentAsset,
  DocumentElement,
  ParsedDocument,
  TableCell,
  TableElement,
} from '@openparser/schema';

export type GroundingTableCellRef = {
  element: TableElement;
  cell: TableCell;
};

export type GroundingSourceIndex = {
  elementsById: Map<string, DocumentElement>;
  tableCellsById: Map<string, GroundingTableCellRef>;
  assetsById: Map<string, DocumentAsset>;
};

/** Plain text of a cited region — the same string lineage aligns against. */
export function groundingRegionText(element: DocumentElement, cell?: TableCell): string {
  if (cell) return cell.text;
  switch (element.kind) {
    case 'text':
      return element.text;
    case 'table':
      return element.cells
        .map((entry) => entry.text)
        .filter(Boolean)
        .join(' ');
    case 'figure':
      return element.caption ?? element.alt_text ?? '';
    case 'formula':
      return element.value;
    case 'key_value':
      return `${element.key.text}: ${element.value.text}`;
    case 'query_answer':
      return `${element.query.text}: ${element.answer?.text ?? ''}`;
    case 'section':
      return element.title ?? '';
    case 'selection_mark':
      return element.state;
    case 'signature':
      return element.text ?? '';
    case 'barcode':
      return element.value;
    case 'link':
      return element.text ?? element.url;
    case 'stamp':
      return element.text ?? '';
    case 'other':
      return element.text ?? element.label;
  }
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&apos;';
    }
  });
}

function elementPageNumber(element: DocumentElement): number {
  return element.locations[0]?.page_number ?? 1;
}

/** Line / word / symbol nodes duplicate higher-level text when both are present. */
function isOcrDetailElement(element: DocumentElement): boolean {
  return (
    element.kind === 'text' &&
    (element.role === 'line' || element.role === 'word' || element.role === 'symbol')
  );
}

/**
 * Prefer page reading order (fallback: page element_ids). Recursively walk the
 * acyclic contains graph from those roots so relation-only section descendants
 * are included. Suppress OCR detail that is already covered by a contains-parent,
 * then keep only the finest useful remaining text tier so section bodies,
 * standalone lines, and tables remain.
 */
function selectGroundingElements(doc: ParsedDocument): DocumentElement[] {
  const elementById = new Map(doc.elements.map((element) => [element.id, element]));
  const childrenByParent = new Map<string, string[]>();
  const containedIds = new Set<string>();
  for (const relation of doc.relations) {
    if (relation.type !== 'contains') continue;
    containedIds.add(relation.to_id);
    const children = childrenByParent.get(relation.from_id) ?? [];
    children.push(relation.to_id);
    childrenByParent.set(relation.from_id, children);
  }

  const selected: DocumentElement[] = [];
  const seen = new Set<string>();

  for (const page of doc.pages) {
    const orderedIds = page.reading_order.length > 0 ? page.reading_order : page.element_ids;
    const pageElementIds = new Set(page.element_ids);
    const candidates: DocumentElement[] = [];
    const visited = new Set<string>();

    const walk = (id: string, ancestors: ReadonlySet<string>): void => {
      if (!pageElementIds.has(id) || ancestors.has(id) || visited.has(id)) return;
      visited.add(id);
      const element = elementById.get(id);
      if (!element) return;
      candidates.push(element);
      const childAncestors = new Set(ancestors).add(id);
      for (const childId of childrenByParent.get(id) ?? []) {
        walk(childId, childAncestors);
      }
    };

    for (const id of orderedIds) {
      walk(id, new Set());
    }

    // Contained OCR detail is already represented by the parent element text.
    let filtered = candidates.filter(
      (element) => !(isOcrDetailElement(element) && containedIds.has(element.id))
    );

    if (filtered.some((element) => element.kind === 'text' && element.role === 'line')) {
      filtered = filtered.filter(
        (element) =>
          element.kind !== 'text' || (element.role !== 'word' && element.role !== 'symbol')
      );
    } else if (filtered.some((element) => element.kind === 'text' && element.role === 'word')) {
      filtered = filtered.filter((element) => element.kind !== 'text' || element.role !== 'symbol');
    }

    for (const element of filtered) {
      if (seen.has(element.id)) continue;
      seen.add(element.id);
      selected.push(element);
    }
  }

  return selected;
}

function elementContent(element: DocumentElement, assetsById: Map<string, DocumentAsset>): string {
  switch (element.kind) {
    case 'text':
      return element.text;
    case 'table':
      return '';
    case 'figure': {
      const uri = element.asset_id ? assetsById.get(element.asset_id)?.uri : undefined;
      return uri ?? element.caption ?? element.alt_text ?? '';
    }
    case 'formula':
      return element.value;
    case 'key_value':
      return `${element.key.text}: ${element.value.text}`;
    case 'query_answer':
      return `${element.query.text}: ${element.answer?.text ?? ''}`;
    case 'section':
      return element.title ?? '';
    case 'selection_mark':
      return element.state;
    case 'signature':
      return element.text ?? '';
    case 'barcode':
      return element.value;
    case 'link':
      return element.text ?? element.url;
    case 'stamp':
      return element.text ?? '';
    case 'other':
      return element.text ?? element.label;
  }
}

function renderTableElementBody(element: TableElement): string {
  if (element.cells.length === 0) {
    return escapeXml(element.html ?? element.markdown ?? '');
  }
  return element.cells
    .map((cell) => `<cell id="${escapeXml(cell.id)}">${escapeXml(cell.text)}</cell>`)
    .join('\n');
}

function renderElementBlock(
  element: DocumentElement,
  assetsById: Map<string, DocumentAsset>
): string {
  const open = `<element id="${escapeXml(element.id)}" type="${escapeXml(element.kind)}" page="${elementPageNumber(element)}">`;
  const close = '</element>';
  if (element.kind === 'table') {
    return [open, renderTableElementBody(element), close].join('\n');
  }
  return [open, escapeXml(elementContent(element, assetsById)), close].join('\n');
}

/** Index citeable graph nodes by stable element / table-cell id. */
export function indexGroundingSources(doc: ParsedDocument): GroundingSourceIndex {
  const elementsById = new Map<string, DocumentElement>();
  const tableCellsById = new Map<string, GroundingTableCellRef>();
  const assetsById = new Map(doc.assets.map((asset) => [asset.id, asset]));

  for (const element of doc.elements) {
    elementsById.set(element.id, element);
    if (element.kind === 'table') {
      for (const cell of element.cells) {
        tableCellsById.set(cell.id, { element, cell });
      }
    }
  }

  return { elementsById, tableCellsById, assetsById };
}

/**
 * Render source-tagged document content for the model.
 * Coordinates are never included. Source payloads are XML-escaped so OCR text
 * cannot close an element or spoof model-facing source tags.
 * Walks page reading order through the contains graph and suppresses duplicate
 * OCR detail; table cells are emitted as citeable `<cell id>` tags under their
 * parent `<element>`.
 */
export function renderGroundedDocument(doc: ParsedDocument): string {
  const { assetsById } = indexGroundingSources(doc);
  return selectGroundingElements(doc)
    .map((element) => renderElementBlock(element, assetsById))
    .join('\n');
}

function elementPlainText(element: DocumentElement): string {
  switch (element.kind) {
    case 'text':
      return element.text;
    case 'section':
      return element.title ?? '';
    case 'formula':
      return element.value;
    case 'barcode':
      return element.value;
    case 'key_value':
      return `${element.key.text}: ${element.value.text}`;
    case 'query_answer':
      return `${element.query.text}: ${element.answer?.text ?? ''}`;
    case 'link':
      return element.text ?? element.url;
    case 'signature':
    case 'stamp':
      return element.text ?? '';
    case 'other':
      return element.text ?? element.label;
    default:
      return '';
  }
}

function referencedAssetIds(elements: DocumentElement[]): Set<string> {
  const ids = new Set<string>();
  for (const element of elements) {
    if ('asset_id' in element && typeof element.asset_id === 'string' && element.asset_id) {
      ids.add(element.asset_id);
    }
  }
  return ids;
}

function referencedPageNumbers(elements: DocumentElement[]): Set<number> {
  const pageNumbers = new Set<number>();
  for (const element of elements) {
    for (const location of element.locations) {
      pageNumbers.add(location.page_number);
    }
    if (element.kind === 'table') {
      for (const cell of element.cells) {
        for (const location of cell.locations) {
          pageNumbers.add(location.page_number);
        }
      }
    }
  }
  return pageNumbers;
}

function filterParsedDocumentToElementIds(
  doc: ParsedDocument,
  keepIds: ReadonlySet<string>
): ParsedDocument {
  const elements = doc.elements.filter((element) => keepIds.has(element.id));
  const pagesWithFilteredIds = doc.pages.map((page) => ({
    ...page,
    element_ids: page.element_ids.filter((id) => keepIds.has(id)),
    reading_order: page.reading_order.filter((id) => keepIds.has(id)),
  }));
  const citedPages = referencedPageNumbers(elements);
  let maxPageNumber = 0;
  for (const pageNumber of citedPages) {
    if (pageNumber > maxPageNumber) maxPageNumber = pageNumber;
  }
  for (const page of pagesWithFilteredIds) {
    if (page.element_ids.length > 0 || page.reading_order.length > 0) {
      if (page.number > maxPageNumber) maxPageNumber = page.number;
    }
  }
  const pages =
    maxPageNumber === 0
      ? [{ ...doc.pages[0]!, element_ids: [], reading_order: [] }]
      : pagesWithFilteredIds.filter((page) => page.number <= maxPageNumber);
  const text = elements
    .map(elementPlainText)
    .filter((value) => value.length > 0)
    .join('\n');
  const assetIds = referencedAssetIds(elements);
  return {
    ...doc,
    text,
    markdown: text,
    pages,
    elements,
    text_annotations: [],
    relations: doc.relations.filter(
      (relation) => keepIds.has(relation.from_id) && keepIds.has(relation.to_id)
    ),
    assets: doc.assets.filter((asset) => assetIds.has(asset.id)),
  };
}

export type TruncatedParsedDocument = {
  document: ParsedDocument;
  truncated: boolean;
  keptElementIds: string[];
};

/**
 * Drop trailing citeable elements until the source-tagged rendering fits
 * `maxChars`. Never splits an element. Always keeps the first citeable
 * element, even when that block alone exceeds the budget.
 */
export function truncateParsedDocumentToCharBudget(
  doc: ParsedDocument,
  maxChars: number
): TruncatedParsedDocument {
  const selected = selectGroundingElements(doc);
  if (selected.length === 0) {
    return { document: doc, truncated: false, keptElementIds: [] };
  }
  const { assetsById } = indexGroundingSources(doc);
  const kept: DocumentElement[] = [];
  let rendered = '';
  for (const element of selected) {
    const block = renderElementBlock(element, assetsById);
    const next = rendered.length === 0 ? block : `${rendered}\n${block}`;
    if (rendered.length > 0 && next.length > maxChars) break;
    kept.push(element);
    rendered = next;
  }
  const keptElementIds = kept.map((element) => element.id);
  if (kept.length === selected.length) {
    return { document: doc, truncated: false, keptElementIds };
  }
  return {
    document: filterParsedDocumentToElementIds(doc, new Set(keptElementIds)),
    truncated: true,
    keptElementIds,
  };
}
