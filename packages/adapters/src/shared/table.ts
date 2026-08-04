import type { TableCell } from '@openparser/schema';

function tableCellCoordinateKey(rowIndex: number, columnIndex: number): string {
  return `${rowIndex}:${columnIndex}`;
}

export function advancePastOccupiedTableCells(
  occupied: Set<string>,
  rowIndex: number,
  columnIndex: number
): number {
  while (occupied.has(tableCellCoordinateKey(rowIndex, columnIndex))) columnIndex++;
  return columnIndex;
}

export function occupyTableCellSpan(
  occupied: Set<string>,
  rowIndex: number,
  columnIndex: number,
  rowSpan: number,
  columnSpan: number
): void {
  for (let row = rowIndex; row < rowIndex + rowSpan; row++) {
    for (let column = columnIndex; column < columnIndex + columnSpan; column++) {
      occupied.add(tableCellCoordinateKey(row, column));
    }
  }
}

type TableRenderSource = {
  cells: TableCell[];
  row_count: number;
  html?: string;
  markdown?: string;
};

/**
 * Canonical table render precedence for shared markdown:
 * 1. structured `cells` (when non-empty)
 * 2. provider `html`
 * 3. provider `markdown`
 */
export function renderTableElement(element: TableRenderSource): string {
  if (element.cells.length > 0) {
    return tableCellsToHtml(element.cells, element.row_count);
  }
  const html = element.html?.trim();
  if (html) return element.html!;
  const markdown = element.markdown?.trim();
  if (markdown) return element.markdown!;
  return '';
}

export function tableCellsFromHtml(
  html: string,
  tableId: string
): { cells: TableCell[]; rowCount: number; columnCount: number } {
  const cells: TableCell[] = [];
  const occupied = new Set<string>();
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  let columnCount = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const rowBody = rows[rowIndex]?.[1] ?? '';
    const rawCells = [...rowBody.matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)];
    let columnIndex = 0;
    for (let cellIndex = 0; cellIndex < rawCells.length; cellIndex++) {
      columnIndex = advancePastOccupiedTableCells(occupied, rowIndex, columnIndex);
      const attributes = rawCells[cellIndex]?.[2] ?? '';
      const rowSpan = positiveAttribute(attributes, 'rowspan');
      const columnSpan = positiveAttribute(attributes, 'colspan');
      occupyTableCellSpan(occupied, rowIndex, columnIndex, rowSpan, columnSpan);
      cells.push({
        id: `${tableId}-cell-${rowIndex}-${cellIndex}`,
        row_index: rowIndex,
        column_index: columnIndex,
        row_span: rowSpan,
        column_span: columnSpan,
        role: rawCells[cellIndex]?.[1]?.toLowerCase() === 'th' ? 'column_header' : 'body',
        text: htmlText(rawCells[cellIndex]?.[3] ?? ''),
        spans: [],
        locations: [],
        element_ids: [],
      });
      columnIndex += columnSpan;
      columnCount = Math.max(columnCount, columnIndex);
    }
  }

  const rowCount = cells.reduce(
    (maximum, cell) => Math.max(maximum, cell.row_index + cell.row_span),
    rows.length
  );
  return { cells, rowCount, columnCount };
}

export function tableCellsToHtml(cells: TableCell[], rowCount: number): string {
  const rows: string[] = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const rowCells = cells
      .filter((cell) => cell.row_index === rowIndex)
      .sort((left, right) => left.column_index - right.column_index);
    if (rowCells.length === 0) continue;
    rows.push(
      `<tr>${rowCells
        .map((cell) => {
          const tag = cell.role === 'column_header' || cell.role === 'row_header' ? 'th' : 'td';
          const rowSpan = cell.row_span > 1 ? ` rowspan="${cell.row_span}"` : '';
          const columnSpan = cell.column_span > 1 ? ` colspan="${cell.column_span}"` : '';
          return `<${tag}${rowSpan}${columnSpan}>${escapeHtml(cell.text)}</${tag}>`;
        })
        .join('')}</tr>`
    );
  }
  return `<table>${rows.join('')}</table>`;
}

function positiveAttribute(attributes: string, name: string): number {
  const value = new RegExp(`\\b${name}\\s*=\\s*["']?(\\d+)`, 'i').exec(attributes)?.[1];
  const parsed = value === undefined ? 1 : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function htmlText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
