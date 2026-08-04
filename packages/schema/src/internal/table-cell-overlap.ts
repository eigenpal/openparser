/**
 * Table-cell overlap detection for {@link TableElementSchema} validation.
 * Not part of the public @openparser/schema API.
 */

type TableCellOverlapRect = {
  id: string;
  row_index: number;
  column_index: number;
  row_span: number;
  column_span: number;
};

type TableCellOverlapResult = {
  /** Earliest-index overlapping partner id per cell, or null. */
  overlaps: Array<string | null>;
  /** True when structural limits for overlap checking were exceeded. */
  limitsExceeded: boolean;
};

/**
 * Soft ceiling on Σ row_span when expanding cells onto rows for interval checks.
 * Avoids allocating attacker-controlled enormous row maps (huge rowspan × few cells)
 * without limiting ordinary large tables (32k 1×1 cells is well under this).
 *
 * Chosen above practical OCR table sizes (providers rarely exceed tens of thousands
 * of cells per table) while bounding worst-case sweep work.
 */
export const MAX_TABLE_CELL_ROW_COVERAGE = 250_000;

type Interval = { colStart: number; colEnd: number; id: string; index: number };

/**
 * Detect overlapping table cells via per-row column-interval sweeps.
 *
 * Each cell contributes its column interval to every row it covers; each row's
 * intervals are sorted and scanned. Complexity is O(R_cov log R_cov) for valid
 * tables where R_cov = Σ row_span (bounded by {@link MAX_TABLE_CELL_ROW_COVERAGE}).
 * Invalid tables with many mutually overlapping cells on one row may trigger
 * {@link limitsExceeded} or stop after the first overlap when `stopAfterFirst`.
 *
 * Overlap partners preserve validation semantics: the later cell reports the
 * earliest-index overlapping cell id (`table cell overlaps <id>`).
 */
export function findOverlappingTableCellIds(
  cells: readonly TableCellOverlapRect[],
  options?: { stopAfterFirst?: boolean }
): TableCellOverlapResult {
  const stopAfterFirst = options?.stopAfterFirst ?? false;
  const overlaps: Array<string | null> = Array.from({ length: cells.length }, () => null);
  const overlapPartnerIndex = Array.from({ length: cells.length }, () => -1);
  let rowCoverage = 0;
  for (const cell of cells) {
    rowCoverage += cell.row_span;
    if (rowCoverage > MAX_TABLE_CELL_ROW_COVERAGE) {
      return { overlaps, limitsExceeded: true };
    }
  }

  const byRow = new Map<number, Interval[]>();

  for (let index = 0; index < cells.length; index++) {
    const cell = cells[index]!;
    const colStart = cell.column_index;
    const colEnd = cell.column_index + cell.column_span;
    for (let row = cell.row_index; row < cell.row_index + cell.row_span; row++) {
      let list = byRow.get(row);
      if (!list) {
        list = [];
        byRow.set(row, list);
      }
      list.push({ colStart, colEnd, id: cell.id, index });
    }
  }

  for (const intervals of byRow.values()) {
    intervals.sort((a, b) => a.colStart - b.colStart || a.index - b.index);
    const active: Interval[] = [];
    let activeStart = 0;
    for (const cur of intervals) {
      while (activeStart < active.length && active[activeStart]!.colEnd <= cur.colStart) {
        activeStart++;
      }
      for (let i = activeStart; i < active.length; i++) {
        const other = active[i]!;
        if (!(cur.colStart < other.colEnd && other.colStart < cur.colEnd)) continue;
        const earlier = Math.min(cur.index, other.index);
        const later = Math.max(cur.index, other.index);
        const earlierId = earlier === cur.index ? cur.id : other.id;
        if (overlapPartnerIndex[later] === -1 || earlier < overlapPartnerIndex[later]) {
          overlapPartnerIndex[later] = earlier;
          overlaps[later] = earlierId;
        }
        if (stopAfterFirst) {
          return { overlaps, limitsExceeded: false };
        }
      }
      let lo = activeStart;
      let hi = active.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (active[mid]!.colEnd < cur.colEnd) lo = mid + 1;
        else hi = mid;
      }
      active.splice(lo, 0, cur);
    }
  }

  return { overlaps, limitsExceeded: false };
}
