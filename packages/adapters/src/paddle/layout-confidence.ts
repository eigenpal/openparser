import type { BoundingBox } from '@openparser/schema/document';

/** Minimum IoU to accept a layout-detection score for a parsing block. */
export const LAYOUT_DET_IOU_THRESHOLD = 0.5;

export type LayoutDetBox = {
  score: number;
  bbox: BoundingBox;
};

/**
 * Axis-aligned intersection-over-union. Returns 0 for empty/degenerate boxes.
 */
export function bboxIoU(a: BoundingBox, b: BoundingBox): number {
  const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const overlap = overlapWidth * overlapHeight;
  const areaA = Math.max(0, a.right - a.left) * Math.max(0, a.bottom - a.top);
  const areaB = Math.max(0, b.right - b.left) * Math.max(0, b.bottom - b.top);
  const union = areaA + areaB - overlap;
  return union > 0 ? overlap / union : 0;
}

/** Normalize `[x1,y1,x2,y2]` (any corner order) into a BoundingBox. */
export function normalizeRawBbox(raw: readonly number[]): BoundingBox | undefined {
  if (raw.length < 4) return undefined;
  const x1 = Number(raw[0]);
  const y1 = Number(raw[1]);
  const x2 = Number(raw[2]);
  const y2 = Number(raw[3]);
  if (![x1, y1, x2, y2].every(Number.isFinite)) return undefined;
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const right = Math.max(x1, x2);
  const bottom = Math.max(y1, y2);
  if (!(right > left) || !(bottom > top)) return undefined;
  return { left, top, right, bottom };
}

/**
 * Safely extract scored layout-detection boxes from a Paddle `prunedResult`.
 * Malformed entries are skipped; missing `layout_det_res` yields `[]`.
 */
export function readLayoutDetBoxes(pruned: Record<string, unknown>): LayoutDetBox[] {
  const layoutDet = pruned.layout_det_res;
  if (!layoutDet || typeof layoutDet !== 'object') return [];
  const boxes = (layoutDet as { boxes?: unknown }).boxes;
  if (!Array.isArray(boxes)) return [];

  const out: LayoutDetBox[] = [];
  for (const box of boxes) {
    if (!box || typeof box !== 'object') continue;
    const entry = box as Record<string, unknown>;
    const score = Number(entry.score);
    if (!Number.isFinite(score) || score < 0 || score > 1) continue;
    const coordinate = entry.coordinate;
    if (!Array.isArray(coordinate)) continue;
    const bbox = normalizeRawBbox(coordinate as number[]);
    if (!bbox) continue;
    out.push({ score, bbox });
  }
  return out;
}

/**
 * Recover detection confidence by best IoU against `layout_det_res.boxes`.
 * Weak overlaps below the threshold are ignored (optional field stays unset).
 */
export function confidenceFromLayoutDet(
  bbox: BoundingBox,
  boxes: readonly LayoutDetBox[],
  threshold: number = LAYOUT_DET_IOU_THRESHOLD
): number | undefined {
  let best: { score: number; iou: number } | undefined;
  for (const box of boxes) {
    const overlap = bboxIoU(bbox, box.bbox);
    if (!best || overlap > best.iou) {
      best = { score: box.score, iou: overlap };
    }
  }
  return best && best.iou >= threshold ? best.score : undefined;
}

/** Direct confidence on a parsing_res_list entry, if present and in [0, 1]. */
export function readDirectBlockConfidence(entry: Record<string, unknown>): number | undefined {
  for (const key of ['block_score', 'confidence', 'score'] as const) {
    const raw = entry[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0 && value <= 1) return value;
  }
  return undefined;
}

/**
 * Prefer a score already on the parsing block; otherwise IoU-match against
 * layout-detection boxes using the block's raw `block_bbox` (Paddle raster
 * space — before any page-space clamp/scale).
 */
export function resolveBlockConfidence(
  entry: Record<string, unknown>,
  layoutDetBoxes: readonly LayoutDetBox[]
): number | undefined {
  const direct = readDirectBlockConfidence(entry);
  if (direct !== undefined) return direct;

  if (layoutDetBoxes.length === 0) return undefined;
  const bboxRaw = entry.block_bbox;
  if (!Array.isArray(bboxRaw)) return undefined;
  const bbox = normalizeRawBbox(bboxRaw as number[]);
  if (!bbox) return undefined;
  return confidenceFromLayoutDet(bbox, layoutDetBoxes);
}
