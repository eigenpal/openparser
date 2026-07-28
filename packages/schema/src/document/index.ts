/**
 * Canonical OpenParser document wire shapes (`openparser@1` and raw profiles).
 */

export {
  BoundingBoxSchema,
  CONTENT_KINDS,
  ChunkProvenanceSpanSchema,
  ContentKindSchema,
  ExtractionChunkSchema,
  PAGE_BLOCK_KINDS,
  PageBlockKindSchema,
  PageBlockSchema,
  ParsedDocumentSchema,
  PointSchema,
  PolygonSchema,
  REGION_TYPES,
  RegionContentSchema,
  RegionSchema,
  RegionTypeSchema,
  type BoundingBox,
  type ChunkProvenanceSpan,
  type ContentKind,
  type ExtractionChunk,
  type PageBlock,
  type PageBlockKind,
  type ParsedDocument,
  type Point,
  type Polygon,
  type Region,
  type RegionContent,
  type RegionType,
} from '../parsed-document';

export {
  OCR_OUTPUT_FORMATS,
  OcrOutputFormatSchema,
  PaddleRawProfileSchema,
  RawParseResultSchema,
  type OcrOutputFormat,
  type RawParseResult,
} from '../raw-result';
