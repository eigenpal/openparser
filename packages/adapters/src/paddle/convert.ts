import type {
  PageBlock,
  ParsedDocument,
  Point,
  Region,
  RegionContent,
} from '@openparser/schema/document';
import { PaddleAdapterError } from './errors';
import {
  assertPublicFigureUri,
  canonicalizeMarkdownFigureUris,
  resolveFigureBlockUri,
  type FigureAssetsMode,
  type FigureAssetUriMap,
  type FigureUriValidator,
} from './figure-uris';
import { readLayoutDetBoxes, resolveBlockConfidence } from './layout-confidence';
import { simplifyLatex, simplifyMarkdownArtifacts, simplifyTableHtml } from './simplify-latex';

export type PageDims = { number: number; width: number; height: number };

const LABEL_TO_REGION: Record<string, Region['type']> = {
  text: 'text',
  paragraph: 'text',
  title: 'heading',
  heading: 'heading',
  table: 'table',
  chart: 'table',
  figure: 'figure',
  image: 'figure',
  formula: 'formula',
  header: 'header_footer',
  footer: 'header_footer',
  seal: 'figure',
  number: 'text',
  footnote: 'text',
  content: 'text',
};

export type MapLayoutResultsInput = {
  documentId: string;
  pages: PageDims[];
  layoutResults: Record<string, unknown>[];
  /** Optional HPS `result.dataInfo.pages` raster dims (fallback when prunedResult omits width/height). */
  dataInfoPages?: Array<PageDims | undefined>;
  figureAssets?: FigureAssetsMode;
  figureUriMap?: FigureAssetUriMap;
  /** When set, stored figure URIs must satisfy this host policy. */
  isPublicFigureUri?: FigureUriValidator;
};

/**
 * Pure Paddle HPS `layoutParsingResults` → `openparser@1` ParsedDocument.
 * Host supplies page fallbacks and any materialized figure URI map.
 */
export function mapLayoutResultsToParsedDocument(input: MapLayoutResultsInput): ParsedDocument {
  const figureAssetsMode = input.figureAssets ?? 'none';
  const figureUriMap = input.figureUriMap ?? new Map();
  const isPublicFigureUri = input.isPublicFigureUri;
  if (input.layoutResults.length !== input.pages.length) {
    throw new PaddleAdapterError(
      `page count mismatch: ${input.layoutResults.length} results for ${input.pages.length} pages`
    );
  }

  const regions: Region[] = [];
  const contents: RegionContent[] = [];
  const blocks: PageBlock[] = [];
  let blockIndex = 0;

  for (let pageIdx = 0; pageIdx < input.pages.length; pageIdx++) {
    const pageFallback = input.pages[pageIdx]!;
    const layoutResult = input.layoutResults[pageIdx]!;
    const pruned = layoutResult.prunedResult;
    if (!pruned || typeof pruned !== 'object') {
      throw new PaddleAdapterError('layout result missing prunedResult');
    }
    const prunedRecord = pruned as Record<string, unknown>;
    const parsingResList = prunedRecord.parsing_res_list;
    if (!Array.isArray(parsingResList)) {
      throw new PaddleAdapterError('layout result missing parsing_res_list');
    }

    // Paddle bboxes/polygons are in page-raster space. Prefer prunedResult
    // width/height, then dataInfo.pages, then media fallback (image pixels /
    // PDF points). Never clamp raster coords into a different space.
    const page = resolveCoordinateDims(prunedRecord, pageFallback, input.dataInfoPages?.[pageIdx]);
    const layoutDetBoxes = readLayoutDetBoxes(prunedRecord);

    for (let i = 0; i < parsingResList.length; i++) {
      const block = parsingResList[i];
      if (!block || typeof block !== 'object') continue;
      const entry = block as Record<string, unknown>;
      const label = String(entry.block_label ?? 'text').trim() || 'text';
      // Preserve empty detections (geometry/type/confidence) — do not drop
      // entries whose block_content is blank (e.g. misplaced title boxes).
      const rawContent = String(entry.block_content ?? '').trim();
      const bboxRaw = entry.block_bbox;
      if (!Array.isArray(bboxRaw) || bboxRaw.length !== 4) {
        throw new PaddleAdapterError('block_bbox must contain four coordinates');
      }
      const blockId = entry.block_id ?? i;
      let regionType = LABEL_TO_REGION[label.toLowerCase()] ?? 'text';
      if (label.toLowerCase() === 'chart' && rawContent.startsWith('<')) {
        regionType = 'table';
      }
      const isTable = regionType === 'table' && rawContent.startsWith('<');
      const isFigure = regionType === 'figure';
      const blockContent = isFigure
        ? rawContent
        : isTable
          ? simplifyTableHtml(rawContent)
          : simplifyLatex(rawContent);
      const bbox = clampBbox(bboxRaw as number[], page.width, page.height);
      const confidence = resolveBlockConfidence(entry, layoutDetBoxes);
      const polygon = readPolygon(entry, page.width, page.height);
      const regionId = `${input.documentId}-${label}-${page.number}-${blockId}`;
      regions.push({
        id: regionId,
        page_number: page.number,
        type: regionType,
        bbox,
        coordinate_width: page.width,
        coordinate_height: page.height,
        ...(confidence === undefined ? {} : { confidence }),
        source_label: label,
        ...(polygon === undefined ? {} : { polygon }),
      });

      if (isTable) {
        contents.push({
          region_id: regionId,
          kind: 'table',
          table_html: blockContent,
          ...(confidence === undefined ? {} : { confidence }),
        });
        blocks.push({
          index: blockIndex++,
          page_number: page.number,
          kind: 'table',
          table_html: blockContent,
          bbox,
          region_id: regionId,
          coordinate_width: page.width,
          coordinate_height: page.height,
          ...(confidence === undefined ? {} : { confidence }),
          source_label: label,
          ...(polygon === undefined ? {} : { polygon }),
        });
      } else if (isFigure) {
        const resolvedUri = resolveFigureBlockUri({
          blockContent,
          figureAssets: figureAssetsMode,
          uriMap: figureUriMap,
        });
        // When crops are being materialised, non-empty figure refs must resolve.
        // Empty detections still keep geometry with a null figure_uri.
        if (figureAssetsMode === 'stored' && rawContent && !resolvedUri) {
          throw new PaddleAdapterError(
            `figure_assets=stored could not resolve a public URI for figure block ${regionId}`,
            false
          );
        }
        if (resolvedUri) {
          assertPublicFigureUri({
            uri: resolvedUri,
            isPublicFigureUri,
            failureMessage: `figure_assets=stored could not resolve a public URI for figure block ${regionId}`,
          });
        }
        contents.push({
          region_id: regionId,
          kind: 'figure',
          // Prefer the public URI; never surface provider crop paths as content.
          text: resolvedUri ?? '',
          ...(confidence === undefined ? {} : { confidence }),
        });
        blocks.push({
          index: blockIndex++,
          page_number: page.number,
          kind: 'figure',
          figure_uri: resolvedUri,
          bbox,
          region_id: regionId,
          coordinate_width: page.width,
          coordinate_height: page.height,
          ...(confidence === undefined ? {} : { confidence }),
          source_label: label,
          ...(polygon === undefined ? {} : { polygon }),
        });
      } else {
        contents.push({
          region_id: regionId,
          kind: 'text',
          text: blockContent,
          ...(confidence === undefined ? {} : { confidence }),
        });
        blocks.push({
          index: blockIndex++,
          page_number: page.number,
          kind: 'text',
          text: blockContent,
          bbox,
          region_id: regionId,
          coordinate_width: page.width,
          coordinate_height: page.height,
          ...(confidence === undefined ? {} : { confidence }),
          source_label: label,
          ...(polygon === undefined ? {} : { polygon }),
        });
      }
    }
  }

  if (blocks.length === 0) {
    blocks.push({
      index: 0,
      page_number: 1,
      kind: 'text',
      text: '',
    });
  }

  let markdown = deriveMarkdown(blocks);
  // Prefer provider markdown when present, then rewrite crop paths to public URIs.
  const providerMarkdownParts: string[] = [];
  for (const layoutResult of input.layoutResults) {
    const md = layoutResult.markdown;
    if (typeof md === 'string' && md.trim()) {
      providerMarkdownParts.push(simplifyMarkdownArtifacts(md));
    } else if (md && typeof md === 'object') {
      const text = (md as Record<string, unknown>).text;
      if (typeof text === 'string' && text.trim()) {
        providerMarkdownParts.push(simplifyMarkdownArtifacts(text));
      }
    }
  }
  if (providerMarkdownParts.length > 0) {
    markdown = providerMarkdownParts.join('\n\n');
  }
  markdown =
    canonicalizeMarkdownFigureUris({
      markdown,
      figureAssets: figureAssetsMode,
      uriMap: figureUriMap,
      isPublicFigureUri,
    }) ?? markdown;
  return {
    output_format: 'openparser@1',
    document_id: input.documentId,
    page_count: input.pages.length,
    markdown,
    blocks,
    regions,
    contents,
    chunks: [],
  };
}

function readPolygon(
  entry: Record<string, unknown>,
  pageWidth: number,
  pageHeight: number
): Point[] | undefined {
  const raw =
    entry.block_polygon_points ?? entry.block_polygon ?? entry.block_poly ?? entry.polygon;
  if (!Array.isArray(raw)) return undefined;
  const pairs: unknown[][] =
    raw.length >= 6 && raw.every((value) => typeof value === 'number')
      ? Array.from({ length: Math.floor(raw.length / 2) }, (_, index) => [
          raw[index * 2],
          raw[index * 2 + 1],
        ])
      : raw.filter((value): value is unknown[] => Array.isArray(value));
  if (pairs.length < 3) return undefined;
  const points: Point[] = [];
  for (const pair of pairs) {
    if (pair.length < 2) return undefined;
    const x = Number(pair[0]);
    const y = Number(pair[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    points.push({
      x: Math.max(0, Math.min(pageWidth, x)),
      y: Math.max(0, Math.min(pageHeight, y)),
    });
  }
  return points;
}

function deriveMarkdown(blocks: PageBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.kind === 'text' && block.text) parts.push(block.text);
    else if (block.kind === 'table' && block.table_html) parts.push(block.table_html);
    else if (block.kind === 'figure' && block.figure_uri) {
      parts.push(`![figure](${block.figure_uri})`);
    }
  }
  return parts.join('\n\n');
}

function clampBbox(
  bbox: number[],
  pageWidth: number,
  pageHeight: number
): { left: number; top: number; right: number; bottom: number } {
  const [rawLeft, rawTop, rawRight, rawBottom] = bbox.map((v) => Math.round(Number(v)));
  const left = Math.max(0, Math.min(pageWidth - 1, rawLeft ?? 0));
  const top = Math.max(0, Math.min(pageHeight - 1, rawTop ?? 0));
  const right = Math.max(left + 1, Math.min(pageWidth, rawRight ?? left + 1));
  const bottom = Math.max(top + 1, Math.min(pageHeight, rawBottom ?? top + 1));
  return { left, top, right, bottom };
}

function readPositiveInt(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.max(1, Math.round(n));
}

/**
 * Coordinate space for Paddle geometry: prunedResult raster dims first,
 * then dataInfo.pages raster dims, then media fallback (image pixels or
 * PDF points as last resort). Boxes stay in that same space — no scaling.
 */
function resolveCoordinateDims(
  pruned: Record<string, unknown>,
  fallback: PageDims,
  dataInfoPage?: PageDims
): PageDims {
  const prunedW = readPositiveInt(pruned.width);
  const prunedH = readPositiveInt(pruned.height);
  if (prunedW !== undefined && prunedH !== undefined) {
    return { number: fallback.number, width: prunedW, height: prunedH };
  }
  if (dataInfoPage) {
    const infoW = readPositiveInt(dataInfoPage.width);
    const infoH = readPositiveInt(dataInfoPage.height);
    if (infoW !== undefined && infoH !== undefined) {
      return { number: fallback.number, width: infoW, height: infoH };
    }
  }
  return fallback;
}

/** Extract optional raster page dims from HPS `result.dataInfo.pages`. */
export function readDataInfoPages(
  result: Record<string, unknown>
): Array<PageDims | undefined> | undefined {
  const dataInfo = result.dataInfo;
  if (!dataInfo || typeof dataInfo !== 'object') return undefined;
  const pages = (dataInfo as { pages?: unknown }).pages;
  if (!Array.isArray(pages) || pages.length === 0) return undefined;
  return pages.map((entry, i) => {
    if (!entry || typeof entry !== 'object') return undefined;
    const width = readPositiveInt((entry as { width?: unknown }).width);
    const height = readPositiveInt((entry as { height?: unknown }).height);
    if (width === undefined || height === undefined) return undefined;
    return { number: i + 1, width, height };
  });
}
