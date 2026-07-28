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
export { simplifyLatex, simplifyMarkdownArtifacts, simplifyTableHtml } from './simplify-latex';
export { OCR_PARSE_CONVERTER_VERSION } from './version';
