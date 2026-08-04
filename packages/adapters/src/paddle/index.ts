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
  PADDLE_LAYOUT_OUTPUT_CAPABILITIES,
  type PaddleLayoutParsedDocument,
  type PaddleLayoutPossibleElementKind,
} from './output';
export { simplifyLatex, simplifyMarkdownArtifacts, simplifyTableHtml } from './simplify-latex';
