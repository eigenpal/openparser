/**
 * Official TypeScript SDK for the OpenParser OCR API.
 *
 * @example
 * ```ts
 * import { OpenParserClient } from '@openparser/sdk';
 *
 * const client = new OpenParserClient({ apiKey: process.env.OPENPARSER_API_KEY });
 *
 * const parsed = await client.parse.sync(
 *   { ocr_model: 'paddleocr-vl-1.6' },
 *   documentFile
 * );
 * ```
 */
export { OpenParserClient, type OpenParserOptions, type OperationResult } from './client';

export {
  OpenParserAuthError,
  OpenParserConflictError,
  OpenParserError,
  OpenParserForbiddenError,
  OpenParserGatewayTimeoutError,
  OpenParserLimitExceededError,
  OpenParserNotFoundError,
  OpenParserPaymentRequiredError,
  OpenParserRateLimitError,
  OpenParserServerError,
  OpenParserServiceUnavailableError,
  OpenParserTimeoutError,
  OpenParserUnprocessableError,
  OpenParserUnsupportedMediaError,
  OpenParserValidationError,
} from './errors';

export { createIdempotencyKey } from './lib/idempotency';

export type {
  ExtractAdmissionOptions,
  ExtractAsyncOptions,
  ExtractBatchOptions,
  ExtractSyncOptions,
} from './resources/extract';
export type { GetJobOptions, GetJobResultOptions, ListJobsOptions } from './resources/jobs';
export type { ListLlmModelsOptions } from './resources/models';
export type {
  ParseAdmissionOptions,
  ParseAsyncOptions,
  ParseBatchOptions,
  ParseSyncOptions,
} from './resources/parse';

export type {
  ErrorBody,
  ErrorResponse,
  ExtractRequest,
  ExtractionPipeline,
  ExtractionTerminalResult,
  Job,
  JobAccepted,
  JobListResponse,
  JobStatus,
  OcrLlmModelsResponse,
  OcrModelsResponse,
  ParseRequest,
  ParseResult,
  ParsedDocument,
  PublicFile,
} from './generated/types.gen';
