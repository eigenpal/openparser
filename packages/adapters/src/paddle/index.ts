export {
  HPS_PARSE_TIMEOUT_MS,
  HPS_PDF_CHUNK_PAGES,
  HPS_PDF_CHUNK_TIMEOUT_MS,
  HPS_PDF_PAGE_MAX_ATTEMPTS,
  HpsAvailabilityError,
  HpsOverloadError,
  HpsParseError,
  HpsPdfCheckpointError,
  HpsPdfChunkSplitError,
  HpsPdfPageTimeoutError,
  HpsRequestTimeoutError,
  createHttpHpsClient,
  type HpsClient,
  type HpsParseInput,
  type HpsParseOutput,
  type HpsPdfChunkRange,
  type HpsPdfChunkState,
  type HttpHpsClientOptions,
} from './client';
export {
  mapLayoutResultsToParsedDocument,
  readDataInfoPages,
  type MapLayoutResultsInput,
  type PageDims,
} from './convert';
export { PaddleAdapterError } from './errors';
export {
  assertPublicFigureUri,
  canonicalizeMarkdownFigureUris,
  resolveFigureBlockUri,
  rewriteMarkdownFigureUris,
  type FigureAssetUriMap,
  type FigureAssetsMode,
  type FigureUriValidator,
} from './figure-uris';
export {
  LAYOUT_DET_IOU_THRESHOLD,
  bboxIoU,
  confidenceFromLayoutDet,
  normalizeRawBbox,
  readDirectBlockConfidence,
  readLayoutDetBoxes,
  resolveBlockConfidence,
  type LayoutDetBox,
} from './layout-confidence';
export {
  HPS_INTERNAL_INVARIANTS,
  LOCKED_HPS_NATIVE_OPTIONS,
  type HpsNativeOptions,
} from './options';
export {
  PADDLE_LAYOUT_OUTPUT_CAPABILITIES,
  type PaddleLayoutParsedDocument,
  type PaddleLayoutPossibleElementKind,
} from './output';
export { simplifyLatex, simplifyMarkdownArtifacts, simplifyTableHtml } from './simplify-latex';
