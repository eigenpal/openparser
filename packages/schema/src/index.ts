/**
 * Public OpenParser OCR output representation (`openparser@1` + raw envelope).
 *
 * Provider/model/service-agnostic document graph and generic raw-result shapes.
 * Hosted API wire contracts live in a private Eigenpal workspace package and
 * are not part of this published surface.
 */

export * from './parsed-document';

export {
  OCR_OUTPUT_FORMATS,
  OcrOutputFormatSchema,
  RawParseResultSchema,
  type OcrOutputFormat,
  type RawParseResult,
} from './raw-result';
