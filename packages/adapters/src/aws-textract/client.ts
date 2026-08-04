/**
 * AWS Textract async client (Detect / Analyze LAYOUT / TABLES+LAYOUT).
 *
 * Starts against an existing S3 source object (no re-upload), polls
 * Get* with pagination, and authenticates via the default AWS SDK credential
 * chain (ECS task role in production). No payload or credential logging.
 */
import {
  GetDocumentAnalysisCommand,
  GetDocumentTextDetectionCommand,
  StartDocumentAnalysisCommand,
  StartDocumentTextDetectionCommand,
  TextractClient,
  type FeatureType,
  type GetDocumentAnalysisCommandOutput,
  type GetDocumentTextDetectionCommandOutput,
  type StartDocumentAnalysisCommandOutput,
  type StartDocumentTextDetectionCommandOutput,
} from '@aws-sdk/client-textract';
import { createHash } from 'node:crypto';
import { mapAwsTextractToParsedDocument } from './convert';
import { AwsTextractAdapterError, AwsTextractError } from './errors';
import { assertAwsTextractAnalyzeCompatibility } from './options';
import {
  type AwsTextractAnalyzeParsedDocument,
  type AwsTextractDetectParsedDocument,
} from './output';

export { AwsTextractError } from './errors';
export const AWS_TEXTRACT_DEFAULT_TIMEOUT_MS = 300_000;
export const AWS_TEXTRACT_DEFAULT_POLL_INTERVAL_MS = 1_000;
export const AWS_TEXTRACT_MAX_POLL_INTERVAL_MS = 5_000;
/** Safety bound on Get* result pages (NextToken loops). */
export const AWS_TEXTRACT_MAX_RESULT_PAGES = 500;
export const AWS_TEXTRACT_MAX_ERROR_CHARS = 500;
export const AWS_TEXTRACT_CLIENT_REQUEST_TOKEN_MAX = 64;
const AWS_TEXTRACT_QUERY_TEXT_PATTERN = /^[\x20-\x7e]+$/;
export type AwsTextractFeatureType = FeatureType;

export type AwsTextractSourceObject = {
  bucket: string;
  objectKey: string;
  /** Optional source-region assertion; must match an explicitly configured client region. */
  region?: string;
};

export type AwsTextractParseInput = {
  documentId: string;
  /** Used for deterministic ClientRequestToken (idempotent Start*). */
  jobId: string;
  source: AwsTextractSourceObject;
  /**
   * Omit for DetectDocumentText. Provide provider-native FeatureTypes for
   * StartDocumentAnalysis.
   */
  featureTypes?: FeatureType[];
  /** Natural-language queries applied to every page (async limit: 30). */
  queries?: string[];
  mediaType?: string;
  signal?: AbortSignal;
};

export type AwsTextractParseOutput = {
  canonical: AwsTextractDetectParsedDocument | AwsTextractAnalyzeParsedDocument;
  /** Aggregated Textract blocks + metadata from the completed job. */
  nativeResult: Record<string, unknown>;
};

export type AwsTextractClient = {
  parse(input: AwsTextractParseInput): Promise<AwsTextractParseOutput>;
};

export type AwsTextractSdkClient = {
  send(
    command: unknown,
    options?: { abortSignal?: AbortSignal }
  ): Promise<
    | StartDocumentTextDetectionCommandOutput
    | StartDocumentAnalysisCommandOutput
    | GetDocumentTextDetectionCommandOutput
    | GetDocumentAnalysisCommandOutput
  >;
};

export type AwsTextractClientOptions = {
  /** Uses the AWS SDK region provider chain when omitted. */
  region?: string;
  /** Overall Start+poll deadline. */
  timeoutMs?: number;
  pollIntervalMs?: number;
  maxPollIntervalMs?: number;
  maxResultPages?: number;
  sleep?: (ms: number) => Promise<void>;
  /**
   * Test seam. Production uses TextractClient with region only — ECS task role /
   * default provider chain; never reads static access keys here.
   */
  client?: AwsTextractSdkClient;
};

/**
 * Deterministic Textract ClientRequestToken derived from a caller-supplied job id.
 * Keeps Start* idempotent across retries for the same logical job.
 */
export function textractClientRequestToken(jobId: string): string {
  const trimmed = jobId.trim();
  if (!trimmed) {
    throw new TypeError('jobId is required for ClientRequestToken');
  }
  if (trimmed.length <= AWS_TEXTRACT_CLIENT_REQUEST_TOKEN_MAX && /^[A-Za-z0-9-_]+$/.test(trimmed)) {
    return trimmed;
  }
  return createHash('sha256')
    .update(trimmed)
    .digest('hex')
    .slice(0, AWS_TEXTRACT_CLIENT_REQUEST_TOKEN_MAX);
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    const id = setTimeout(resolve, ms);
    id.unref?.();
  });

/**
 * Production Textract async client against an existing S3 object in the configured region.
 */
export function createAwsTextractClient(options: AwsTextractClientOptions = {}): AwsTextractClient {
  const region = options.region?.trim() || undefined;
  const timeoutMs = options.timeoutMs ?? AWS_TEXTRACT_DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? AWS_TEXTRACT_DEFAULT_POLL_INTERVAL_MS;
  const maxPollIntervalMs = options.maxPollIntervalMs ?? AWS_TEXTRACT_MAX_POLL_INTERVAL_MS;
  const maxResultPages = options.maxResultPages ?? AWS_TEXTRACT_MAX_RESULT_PAGES;
  const sleep = options.sleep ?? defaultSleep;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('timeoutMs must be positive');
  }
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs <= 0) {
    throw new TypeError('pollIntervalMs must be positive');
  }
  if (!Number.isInteger(maxResultPages) || maxResultPages < 1) {
    throw new TypeError('maxResultPages must be a positive integer');
  }

  // No accessKeyId/secretAccessKey — ECS task role / default credential chain.
  const client: AwsTextractSdkClient =
    options.client ??
    new TextractClient({
      ...(region === undefined ? {} : { region }),
      maxAttempts: 1,
    });

  return {
    async parse(input: AwsTextractParseInput): Promise<AwsTextractParseOutput> {
      validateParseInput(input, region);

      const signals: AbortSignal[] = [AbortSignal.timeout(timeoutMs)];
      if (input.signal) signals.push(input.signal);
      const signal = signals.length === 1 ? signals[0]! : AbortSignal.any(signals);

      const token = textractClientRequestToken(input.jobId);
      const featureTypes = input.featureTypes;
      const documentLocation = {
        S3Object: {
          Bucket: input.source.bucket,
          Name: input.source.objectKey,
        },
      };

      let textractJobId: string;
      try {
        if (featureTypes === undefined) {
          const started = (await client.send(
            new StartDocumentTextDetectionCommand({
              DocumentLocation: documentLocation,
              ClientRequestToken: token,
            }),
            { abortSignal: signal }
          )) as StartDocumentTextDetectionCommandOutput;
          if (!started.JobId) {
            throw new AwsTextractError('AWS Textract StartDocumentTextDetection returned no JobId');
          }
          textractJobId = started.JobId;
        } else {
          const started = (await client.send(
            new StartDocumentAnalysisCommand({
              DocumentLocation: documentLocation,
              FeatureTypes: featureTypes,
              ...(input.queries?.length
                ? {
                    QueriesConfig: {
                      Queries: input.queries.map((text) => ({ Text: text, Pages: ['*'] })),
                    },
                  }
                : {}),
              ClientRequestToken: token,
            }),
            { abortSignal: signal }
          )) as StartDocumentAnalysisCommandOutput;
          if (!started.JobId) {
            throw new AwsTextractError('AWS Textract StartDocumentAnalysis returned no JobId');
          }
          textractJobId = started.JobId;
        }
      } catch (error) {
        throw mapAwsSdkError(error, 'start');
      }

      const aggregated = await pollAndCollect({
        client,
        operation: featureTypes === undefined ? 'detect' : 'analyze',
        textractJobId,
        signal,
        pollIntervalMs,
        maxPollIntervalMs,
        maxResultPages,
        sleep,
      });

      const nativeResult: Record<string, unknown> = {
        operation: featureTypes === undefined ? 'detect_document_text' : 'analyze_document',
        ...(featureTypes ? { feature_types: featureTypes } : {}),
        ...(input.queries?.length ? { queries: input.queries } : {}),
        textract_job_id: textractJobId,
        client_request_token: token,
        page_count: aggregated.pageCount,
        blocks: aggregated.blocks,
        ...(aggregated.modelVersion ? { model_version: aggregated.modelVersion } : {}),
      };

      try {
        const canonical = mapAwsTextractToParsedDocument({
          documentId: input.documentId,
          response: {
            page_count: aggregated.pageCount,
            blocks: aggregated.blocks,
            operation: featureTypes === undefined ? 'detect_document_text' : 'analyze_document',
            ...(aggregated.modelVersion === undefined
              ? {}
              : { model_version: aggregated.modelVersion }),
          },
          model:
            featureTypes === undefined
              ? 'textract-detect-document-text'
              : 'textract-analyze-document',
        });
        return {
          canonical,
          nativeResult,
        };
      } catch (error) {
        if (error instanceof AwsTextractAdapterError) {
          throw new AwsTextractError(error.message, {
            retryable: error.retryable,
            cause: error,
          });
        }
        throw error;
      }
    },
  };
}

function validateParseInput(input: AwsTextractParseInput, clientRegion: string | undefined): void {
  if (!input.documentId?.trim()) {
    throw new AwsTextractError('AWS Textract requires documentId');
  }
  if (!input.jobId?.trim()) {
    throw new AwsTextractError('AWS Textract requires jobId');
  }
  if (!input.source?.bucket?.trim() || !input.source?.objectKey?.trim()) {
    throw new AwsTextractError('AWS Textract requires source.bucket and source.objectKey');
  }
  const sourceRegion = input.source.region?.trim();
  if (sourceRegion !== undefined && clientRegion !== undefined && sourceRegion !== clientRegion) {
    throw new AwsTextractError(
      `AWS Textract source object region ${sourceRegion} does not match client region ${clientRegion}`,
      {
        providerCode: 'invalid_source_region',
      }
    );
  }
  if (
    input.featureTypes !== undefined &&
    (!Array.isArray(input.featureTypes) || input.featureTypes.length === 0)
  ) {
    throw new AwsTextractError('AWS Textract featureTypes must be a non-empty array');
  }
  if (input.queries !== undefined) {
    if (
      !Array.isArray(input.queries) ||
      input.queries.length < 1 ||
      input.queries.length > 30 ||
      input.queries.some(
        (query) =>
          typeof query !== 'string' ||
          query.trim().length < 1 ||
          query.length > 200 ||
          !AWS_TEXTRACT_QUERY_TEXT_PATTERN.test(query)
      )
    ) {
      throw new AwsTextractError(
        'AWS Textract queries must contain 1-30 printable-ASCII questions of at most 200 characters'
      );
    }
  }
  assertAwsTextractAnalyzeCompatibility({
    featureTypes: input.featureTypes,
    queries: input.queries,
  });
}

async function pollAndCollect(input: {
  client: AwsTextractSdkClient;
  operation: 'detect' | 'analyze';
  textractJobId: string;
  signal: AbortSignal;
  pollIntervalMs: number;
  maxPollIntervalMs: number;
  maxResultPages: number;
  sleep: (ms: number) => Promise<void>;
}): Promise<{
  pageCount: number;
  blocks: Record<string, unknown>[];
  modelVersion?: string;
}> {
  let delay = input.pollIntervalMs;

  for (;;) {
    if (input.signal.aborted) {
      throw new AwsTextractError('AWS Textract poll aborted or timed out', { retryable: true });
    }

    let page: GetDocumentTextDetectionCommandOutput | GetDocumentAnalysisCommandOutput;
    try {
      page = await getFirstPage(input.client, input.operation, input.textractJobId, input.signal);
    } catch (error) {
      throw mapAwsSdkError(error, 'get');
    }

    const status = page.JobStatus ?? 'FAILED';
    const statusMessage = page.StatusMessage;

    if (status === 'SUCCEEDED') {
      return collectAllPages({
        client: input.client,
        operation: input.operation,
        textractJobId: input.textractJobId,
        signal: input.signal,
        maxResultPages: input.maxResultPages,
        firstPage: page,
      });
    }

    if (status === 'FAILED' || status === 'PARTIAL_SUCCESS') {
      throw new AwsTextractError(sanitizeMessage(statusMessage) ?? `AWS Textract job ${status}`, {
        retryable: false,
        providerCode: status,
      });
    }

    if (status !== 'IN_PROGRESS') {
      throw new AwsTextractError(`AWS Textract returned unexpected JobStatus: ${status}`, {
        providerCode: status,
      });
    }

    await input.sleep(delay);
    delay = Math.min(delay * 2, input.maxPollIntervalMs);
  }
}

async function getFirstPage(
  client: AwsTextractSdkClient,
  operation: 'detect' | 'analyze',
  textractJobId: string,
  signal: AbortSignal
): Promise<GetDocumentTextDetectionCommandOutput | GetDocumentAnalysisCommandOutput> {
  if (operation === 'detect') {
    return (await client.send(new GetDocumentTextDetectionCommand({ JobId: textractJobId }), {
      abortSignal: signal,
    })) as GetDocumentTextDetectionCommandOutput;
  }
  return (await client.send(new GetDocumentAnalysisCommand({ JobId: textractJobId }), {
    abortSignal: signal,
  })) as GetDocumentAnalysisCommandOutput;
}

async function collectAllPages(input: {
  client: AwsTextractSdkClient;
  operation: 'detect' | 'analyze';
  textractJobId: string;
  signal: AbortSignal;
  maxResultPages: number;
  firstPage: GetDocumentTextDetectionCommandOutput | GetDocumentAnalysisCommandOutput;
}): Promise<{
  pageCount: number;
  blocks: Record<string, unknown>[];
  modelVersion?: string;
}> {
  const blocks: Record<string, unknown>[] = [];
  let nextToken = input.firstPage.NextToken;
  let pageCount = readPageCount(input.firstPage);
  let modelVersion = readModelVersion(input.firstPage, input.operation);
  appendBlocks(blocks, input.firstPage.Blocks);
  let pagesFetched = 1;

  while (nextToken) {
    if (pagesFetched >= input.maxResultPages) {
      throw new AwsTextractError(
        `AWS Textract Get* exceeded ${input.maxResultPages} result pages`,
        { providerCode: 'result_page_limit' }
      );
    }
    if (input.signal.aborted) {
      throw new AwsTextractError('AWS Textract pagination aborted or timed out', {
        retryable: true,
      });
    }

    let page: GetDocumentTextDetectionCommandOutput | GetDocumentAnalysisCommandOutput;
    try {
      if (input.operation === 'detect') {
        page = (await input.client.send(
          new GetDocumentTextDetectionCommand({
            JobId: input.textractJobId,
            NextToken: nextToken,
          }),
          { abortSignal: input.signal }
        )) as GetDocumentTextDetectionCommandOutput;
      } else {
        page = (await input.client.send(
          new GetDocumentAnalysisCommand({
            JobId: input.textractJobId,
            NextToken: nextToken,
          }),
          { abortSignal: input.signal }
        )) as GetDocumentAnalysisCommandOutput;
      }
    } catch (error) {
      throw mapAwsSdkError(error, 'get');
    }

    appendBlocks(blocks, page.Blocks);
    pageCount = Math.max(pageCount, readPageCount(page));
    modelVersion = modelVersion ?? readModelVersion(page, input.operation);
    nextToken = page.NextToken;
    pagesFetched += 1;
  }

  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new AwsTextractError('AWS Textract returned no page count');
  }
  if (blocks.length < 1) {
    throw new AwsTextractError('AWS Textract returned no blocks');
  }

  return { pageCount, blocks, modelVersion };
}

function appendBlocks(target: Record<string, unknown>[], blocks: unknown[] | undefined): void {
  if (!Array.isArray(blocks)) return;
  for (const block of blocks) {
    if (block && typeof block === 'object') {
      target.push(block as Record<string, unknown>);
    }
  }
}

function readPageCount(
  page: GetDocumentTextDetectionCommandOutput | GetDocumentAnalysisCommandOutput
): number {
  const pages = page.DocumentMetadata?.Pages;
  return typeof pages === 'number' && Number.isInteger(pages) ? pages : 0;
}

function readModelVersion(
  page: GetDocumentTextDetectionCommandOutput | GetDocumentAnalysisCommandOutput,
  operation: 'detect' | 'analyze'
): string | undefined {
  if (operation === 'detect') {
    const version = (page as GetDocumentTextDetectionCommandOutput).DetectDocumentTextModelVersion;
    return typeof version === 'string' ? version : undefined;
  }
  const version = (page as GetDocumentAnalysisCommandOutput).AnalyzeDocumentModelVersion;
  return typeof version === 'string' ? version : undefined;
}

function mapAwsSdkError(error: unknown, phase: 'start' | 'get'): AwsTextractError {
  if (error instanceof AwsTextractError) return error;
  if (isAbortError(error)) {
    return new AwsTextractError(`AWS Textract ${phase} aborted or timed out`, {
      retryable: true,
      cause: error,
    });
  }

  const name =
    error && typeof error === 'object' && typeof (error as { name?: unknown }).name === 'string'
      ? (error as { name: string }).name
      : undefined;
  const message =
    error &&
    typeof error === 'object' &&
    typeof (error as { message?: unknown }).message === 'string'
      ? sanitizeMessage((error as { message: string }).message)
      : undefined;

  const retryable =
    name === 'ThrottlingException' ||
    name === 'ProvisionedThroughputExceededException' ||
    name === 'LimitExceededException' ||
    name === 'InternalServerError' ||
    name === 'ServiceUnavailable' ||
    name === 'TimeoutError' ||
    name === 'AbortError';

  return new AwsTextractError(
    message
      ? `AWS Textract ${phase} failed: ${message}`
      : `AWS Textract ${phase} failed${name ? ` (${name})` : ''}`,
    {
      retryable,
      providerCode: name,
      cause: error,
    }
  );
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: unknown }).name;
  return name === 'AbortError' || name === 'TimeoutError';
}

function sanitizeMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;
  const cleaned = message
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, '[redacted]')
    .replace(/[A-Za-z0-9+/]{80,}={0,2}/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, AWS_TEXTRACT_MAX_ERROR_CHARS);
}
