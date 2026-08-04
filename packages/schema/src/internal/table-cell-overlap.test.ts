import { describe, expect, it } from 'bun:test';
import { findOverlappingTableCellIds, MAX_TABLE_CELL_ROW_COVERAGE } from './table-cell-overlap';

describe('table cell overlap sweep', () => {
  it('reports the earliest overlapping partner for later cells', () => {
    const { overlaps, limitsExceeded } = findOverlappingTableCellIds([
      {
        id: 'anchor',
        row_index: 0,
        column_index: 0,
        row_span: 2,
        column_span: 2,
      },
      {
        id: 'intruder',
        row_index: 1,
        column_index: 1,
        row_span: 1,
        column_span: 1,
      },
    ]);
    expect(limitsExceeded).toBe(false);
    expect(overlaps).toEqual([null, 'anchor']);
  });

  it('stops after the first overlap when requested', () => {
    const { overlaps } = findOverlappingTableCellIds(
      [
        { id: 'a', row_index: 0, column_index: 0, row_span: 1, column_span: 2 },
        { id: 'b', row_index: 0, column_index: 1, row_span: 1, column_span: 1 },
        { id: 'c', row_index: 0, column_index: 1, row_span: 1, column_span: 1 },
      ],
      { stopAfterFirst: true }
    );
    expect(overlaps.filter((id) => id != null)).toHaveLength(1);
  });

  it('scales for large non-overlapping tables without pairwise cost', () => {
    const cellCount = 32_000;
    const cells = Array.from({ length: cellCount }, (_, index) => ({
      id: `c${index}`,
      row_index: index,
      column_index: 0,
      row_span: 1,
      column_span: 1,
    }));
    const pairwiseComparisons = (cellCount * (cellCount - 1)) / 2;
    expect(pairwiseComparisons).toBeGreaterThan(cellCount * 1000);

    const started = performance.now();
    const { overlaps, limitsExceeded } = findOverlappingTableCellIds(cells);
    const elapsedMs = performance.now() - started;

    expect(limitsExceeded).toBe(false);
    expect(overlaps.every((id) => id == null)).toBe(true);
    expect(elapsedMs).toBeLessThan(500);
  });

  it('rejects tables whose row coverage exceeds the structural limit', () => {
    const { limitsExceeded } = findOverlappingTableCellIds([
      {
        id: 'huge',
        row_index: 0,
        column_index: 0,
        row_span: MAX_TABLE_CELL_ROW_COVERAGE + 1,
        column_span: 1,
      },
    ]);
    expect(limitsExceeded).toBe(true);
  });
});
