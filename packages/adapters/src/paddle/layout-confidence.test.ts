import { describe, expect, test } from 'bun:test';
import {
  bboxIoU,
  confidenceFromLayoutDet,
  resolveBlockConfidence,
  type LayoutDetBox,
} from './layout-confidence';

const exactBox = { left: 10, top: 20, right: 110, bottom: 120 };

describe('layout-confidence IoU helpers', () => {
  test('exact overlap recovers the layout_det score', () => {
    const boxes: LayoutDetBox[] = [{ score: 0.91, bbox: { ...exactBox } }];
    expect(bboxIoU(exactBox, boxes[0]!.bbox)).toBe(1);
    expect(confidenceFromLayoutDet(exactBox, boxes)).toBe(0.91);
  });

  test('merged/partial overlap at threshold recovers the best score', () => {
    // Block 100×100; det covers top 60% → IoU = 0.6 (≥ 0.5).
    const block = { left: 0, top: 0, right: 100, bottom: 100 };
    const partial = { left: 0, top: 0, right: 100, bottom: 60 };
    expect(bboxIoU(block, partial)).toBeCloseTo(0.6, 5);

    const boxes: LayoutDetBox[] = [
      { score: 0.4, bbox: { left: 200, top: 200, right: 250, bottom: 250 } },
      { score: 0.88, bbox: partial },
    ];
    expect(confidenceFromLayoutDet(block, boxes)).toBe(0.88);
  });

  test('weak overlap below threshold yields no confidence', () => {
    // Block 100×100; det covers top 40% → IoU = 0.4 (< 0.5).
    const block = { left: 0, top: 0, right: 100, bottom: 100 };
    const weak = { left: 0, top: 0, right: 100, bottom: 40 };
    expect(bboxIoU(block, weak)).toBeCloseTo(0.4, 5);
    expect(confidenceFromLayoutDet(block, [{ score: 0.99, bbox: weak }])).toBeUndefined();
  });

  test('direct block confidence takes precedence over layout_det IoU', () => {
    const entry = {
      block_bbox: [10, 20, 110, 120],
      block_score: 0.77,
    };
    const boxes: LayoutDetBox[] = [{ score: 0.99, bbox: { ...exactBox } }];
    expect(resolveBlockConfidence(entry, boxes)).toBe(0.77);
  });

  test('falls back to layout_det IoU when parsing block has no score', () => {
    const entry = { block_bbox: [10, 20, 110, 120] };
    const boxes: LayoutDetBox[] = [{ score: 0.93, bbox: { ...exactBox } }];
    expect(resolveBlockConfidence(entry, boxes)).toBe(0.93);
  });
});
