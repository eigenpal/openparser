import type {
  Confidence,
  DocumentAsset,
  DocumentElement,
  DocumentPage,
  Geometry,
  Point,
  TextRole,
} from '@openparser/schema';
import { parseCanonicalWithCapabilities } from '../shared/parse-canonical';
import { renderCanonicalMarkdown } from '../shared/render';
import { tableCellsFromHtml } from '../shared/table';
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
import { PADDLE_LAYOUT_OUTPUT_CAPABILITIES, type PaddleLayoutParsedDocument } from './output';
import { simplifyLatex, simplifyTableHtml } from './simplify-latex';

export type PageDims = { number: number; width: number; height: number };

const TEXT_ROLE_BY_LABEL: Record<string, TextRole> = {
  text: 'paragraph',
  paragraph: 'paragraph',
  doc_title: 'document_title',
  title: 'heading',
  paragraph_title: 'heading',
  heading: 'heading',
  number: 'page_number',
  footnote: 'footnote',
  content: 'paragraph',
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
  model?: string;
  version?: string;
};

/**
 * Pure Paddle HPS `layoutParsingResults` → `openparser@1` document graph.
 */
export function mapLayoutResultsToParsedDocument(
  input: MapLayoutResultsInput
): PaddleLayoutParsedDocument {
  const figureAssetsMode = input.figureAssets ?? 'none';
  const figureUriMap = input.figureUriMap ?? new Map();
  const isPublicFigureUri = input.isPublicFigureUri;
  if (input.layoutResults.length !== input.pages.length) {
    throw new PaddleAdapterError(
      `page count mismatch: ${input.layoutResults.length} results for ${input.pages.length} pages`
    );
  }

  const pages: DocumentPage[] = [];
  const elements: DocumentElement[] = [];
  const assets: DocumentAsset[] = [];
  const plainTextParts: string[] = [];

  for (let pageIndex = 0; pageIndex < input.pages.length; pageIndex++) {
    const pageFallback = input.pages[pageIndex]!;
    const layoutResult = input.layoutResults[pageIndex]!;
    const pruned = layoutResult.prunedResult;
    if (!pruned || typeof pruned !== 'object') {
      throw new PaddleAdapterError('layout result missing prunedResult');
    }
    const prunedRecord = pruned as Record<string, unknown>;
    const parsingResList = prunedRecord.parsing_res_list;
    if (!Array.isArray(parsingResList)) {
      throw new PaddleAdapterError('layout result missing parsing_res_list');
    }

    const dimensions = resolveCoordinateDims(
      prunedRecord,
      pageFallback,
      input.dataInfoPages?.[pageIndex]
    );
    const layoutDetBoxes = readLayoutDetBoxes(prunedRecord);
    const pageElementIds: string[] = [];

    for (let index = 0; index < parsingResList.length; index++) {
      const block = parsingResList[index];
      if (!block || typeof block !== 'object') continue;
      const entry = block as Record<string, unknown>;
      const label = String(entry.block_label ?? 'text').trim() || 'text';
      const normalizedLabel = label.toLowerCase();
      const rawContent = String(entry.block_content ?? '').trim();
      const bboxRaw = entry.block_bbox;
      if (!Array.isArray(bboxRaw) || bboxRaw.length !== 4) {
        throw new PaddleAdapterError('block_bbox must contain four coordinates');
      }

      const nativeId = String(entry.block_id ?? index);
      const elementId = `${input.documentId}-paddle-${dimensions.number}-${nativeId}`;
      const bbox = clampBbox(bboxRaw as number[], dimensions.width, dimensions.height);
      const polygon = readPolygon(entry, dimensions.width, dimensions.height);
      const locations: Geometry[] = [
        {
          page_number: dimensions.number,
          bbox,
          ...(polygon === undefined ? {} : { polygon }),
        },
      ];
      const confidence = canonicalConfidence(resolveBlockConfidence(entry, layoutDetBoxes));
      const source = {
        native_id: nativeId,
        native_type: 'layout_block',
        native_label: label,
      };
      const common = {
        id: elementId,
        locations,
        ...(confidence === undefined ? {} : { confidence }),
        source,
      };

      let element: DocumentElement;
      if (normalizedLabel === 'table' || normalizedLabel === 'chart') {
        const html = rawContent.startsWith('<') ? simplifyTableHtml(rawContent) : undefined;
        if (html !== undefined) {
          const table = tableCellsFromHtml(html, elementId);
          element = {
            ...common,
            kind: 'table',
            row_count: table.rowCount,
            column_count: table.columnCount,
            cells: table.cells,
            html,
          };
          plainTextParts.push(stripMarkup(html));
        } else {
          element = {
            ...common,
            kind: 'figure',
            caption_spans: [],
            ...(rawContent ? { caption: simplifyLatex(rawContent) } : {}),
          };
          if (rawContent) plainTextParts.push(simplifyLatex(rawContent));
        }
      } else if (
        normalizedLabel === 'figure' ||
        normalizedLabel === 'image' ||
        normalizedLabel === 'seal'
      ) {
        const resolvedUri = resolveFigureBlockUri({
          blockContent: rawContent,
          figureAssets: figureAssetsMode,
          uriMap: figureUriMap,
        });
        if (figureAssetsMode === 'stored' && rawContent && !resolvedUri) {
          throw new PaddleAdapterError(
            `figure_assets=stored could not resolve a public URI for figure block ${elementId}`,
            false
          );
        }
        if (resolvedUri) {
          assertPublicFigureUri({
            uri: resolvedUri,
            isPublicFigureUri,
            failureMessage: `figure_assets=stored could not resolve a public URI for figure block ${elementId}`,
          });
        }
        if (normalizedLabel === 'seal') {
          element = {
            ...common,
            kind: 'stamp',
            ...(rawContent ? { text: simplifyLatex(rawContent) } : {}),
          };
        } else {
          const assetId = resolvedUri ? `${elementId}-asset` : undefined;
          if (assetId && resolvedUri) {
            assets.push({
              id: assetId,
              kind: 'figure',
              uri: resolvedUri,
              page_number: dimensions.number,
            });
          }
          element = {
            ...common,
            kind: 'figure',
            caption_spans: [],
            ...(assetId === undefined ? {} : { asset_id: assetId }),
            ...(rawContent && !resolvedUri ? { alt_text: simplifyLatex(rawContent) } : {}),
          };
        }
      } else if (normalizedLabel === 'formula') {
        const value = simplifyLatex(rawContent);
        element = {
          ...common,
          kind: 'formula',
          value,
          format: 'latex',
          spans: [],
        };
        if (value) plainTextParts.push(value);
      } else {
        const text = simplifyLatex(rawContent);
        element = {
          ...common,
          kind: 'text',
          role:
            normalizedLabel === 'header'
              ? 'page_header'
              : normalizedLabel === 'footer'
                ? 'page_footer'
                : (TEXT_ROLE_BY_LABEL[normalizedLabel] ?? 'other'),
          text,
          spans: [],
          languages: [],
        };
        if (text) plainTextParts.push(text);
      }

      elements.push(element);
      pageElementIds.push(elementId);
    }

    pages.push({
      number: dimensions.number,
      source_page_number: pageFallback.number,
      width: dimensions.width,
      height: dimensions.height,
      unit: 'pixel',
      rotation_degrees: 0,
      languages: [],
      element_ids: pageElementIds,
      reading_order: [...pageElementIds],
    });
  }

  let markdown = renderCanonicalMarkdown({ pages, elements, assets });
  markdown =
    canonicalizeMarkdownFigureUris({
      markdown,
      figureAssets: figureAssetsMode,
      uriMap: figureUriMap,
      isPublicFigureUri,
    }) ?? markdown;

  return parseCanonicalWithCapabilities(
    {
      output_format: 'openparser@1',
      document_id: input.documentId,
      provenance: {
        provider: 'baidu',
        model: input.model ?? 'paddleocr-vl',
        ...(input.version === undefined ? {} : { version: input.version }),
        operation: 'layout_parsing',
      },
      text: plainTextParts.join('\n\n'),
      markdown,
      pages,
      elements,
      text_annotations: [],
      relations: [],
      assets,
    },
    PADDLE_LAYOUT_OUTPUT_CAPABILITIES
  );
}

function canonicalConfidence(value: number | undefined): Confidence | undefined {
  if (value === undefined) return undefined;
  return {
    score: Math.min(1, Math.max(0, value)),
    scope: 'detection',
    calibrated: false,
    source_value: value,
    source_scale: 'zero_to_one',
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

function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampBbox(
  bbox: number[],
  pageWidth: number,
  pageHeight: number
): { left: number; top: number; right: number; bottom: number } {
  const [rawLeft, rawTop, rawRight, rawBottom] = bbox.map((value) => Math.round(Number(value)));
  const left = Math.max(0, Math.min(pageWidth - 1, rawLeft ?? 0));
  const top = Math.max(0, Math.min(pageHeight - 1, rawTop ?? 0));
  const right = Math.max(left + 1, Math.min(pageWidth, rawRight ?? left + 1));
  const bottom = Math.max(top + 1, Math.min(pageHeight, rawBottom ?? top + 1));
  return { left, top, right, bottom };
}

function readPositiveInt(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || number <= 0) return undefined;
  return Math.max(1, Math.round(number));
}

function resolveCoordinateDims(
  pruned: Record<string, unknown>,
  fallback: PageDims,
  dataInfoPage?: PageDims
): PageDims {
  const prunedWidth = readPositiveInt(pruned.width);
  const prunedHeight = readPositiveInt(pruned.height);
  if (prunedWidth !== undefined && prunedHeight !== undefined) {
    return { number: fallback.number, width: prunedWidth, height: prunedHeight };
  }
  if (dataInfoPage) {
    const infoWidth = readPositiveInt(dataInfoPage.width);
    const infoHeight = readPositiveInt(dataInfoPage.height);
    if (infoWidth !== undefined && infoHeight !== undefined) {
      return { number: fallback.number, width: infoWidth, height: infoHeight };
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
  return pages.map((entry, index) => {
    if (!entry || typeof entry !== 'object') return undefined;
    const width = readPositiveInt((entry as { width?: unknown }).width);
    const height = readPositiveInt((entry as { height?: unknown }).height);
    if (width === undefined || height === undefined) return undefined;
    return { number: index + 1, width, height };
  });
}
