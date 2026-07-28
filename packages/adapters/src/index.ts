/**
 * Root entry — prefer subpath imports such as `@openparser/adapters/paddle`.
 */
export {
  OCR_PARSE_CONVERTER_VERSION,
  PaddleAdapterError,
  assertPublicFigureUri,
  canonicalizeMarkdownFigureUris,
  mapLayoutResultsToParsedDocument,
  readDataInfoPages,
  resolveFigureBlockUri,
  rewriteMarkdownFigureUris,
  type FigureAssetUriMap,
  type FigureAssetsMode,
  type FigureUriValidator,
  type MapLayoutResultsInput,
  type PageDims,
} from './paddle/index';
