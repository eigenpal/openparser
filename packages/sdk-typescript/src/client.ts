import {
  asErrorResponse,
  errorFromResponse,
  OpenParserError,
  OpenParserTimeoutError,
} from './errors';
import { createClient, createConfig, type Client, type Config } from './generated/client';
import type { ErrorResponse } from './generated/types.gen';
import { disposeRequestTimeout, withRequestTimeout } from './lib/compose-abort-signal';
import {
  isRetriableStatus,
  isRetryableRequest,
  type RequestRetryContext,
} from './lib/retry-policy';
import { ExtractResource } from './resources/extract';
import { FilesResource } from './resources/files';
import { JobsResource } from './resources/jobs';
import { ModelsResource } from './resources/models';
import { ParseResource } from './resources/parse';
import { PipelinesResource } from './resources/pipelines';
import { buildTelemetryHeaders } from './telemetry';

export interface OpenParserOptions {
  /**
   * API key with `ocr:full` or platform wildcard scope.
   *
   * Falls back to the `OPENPARSER_API_KEY` environment variable when omitted.
   */
  apiKey?: string;
  /**
   * Override the API base URL.
   *
   * Defaults to `OPENPARSER_BASE_URL` if set, otherwise `https://api.openparser.dev`.
   */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Defaults to 300_000 (sync parse wait limit). */
  timeoutMs?: number;
  /**
   * How many times to retry ambiguous failures (5xx, 429, transport errors).
   *
   * Retries apply only to safe methods (`GET`, `HEAD`) and requests that send
   * an `Idempotency-Key` (parse/extract admission). Other mutations fail fast.
   * Defaults to 3.
   */
  maxRetries?: number;
  /** Inject a custom fetch implementation (testing). Defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Extra headers attached to every request. */
  defaultHeaders?: Record<string, string>;
}

const DEFAULT_BASE_URL = 'https://api.openparser.dev';
const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_MAX_RETRIES = 3;

export interface OperationResult<T> {
  data?: T;
  error?: unknown;
  response?: Response;
  request?: Request;
}

/**
 * The OpenParser SDK client.
 *
 * ```ts
 * import { OpenParserClient } from '@openparser/sdk';
 *
 * const client = new OpenParserClient({ apiKey: process.env.OPENPARSER_API_KEY });
 *
 * const parsed = await client.parse.sync(
 *   { ocr_model: 'paddleocr-vl-1.6' },
 *   file
 * );
 * ```
 */
export class OpenParserClient {
  public readonly parse: ParseResource;
  public readonly extract: ExtractResource;
  public readonly jobs: JobsResource;
  public readonly files: FilesResource;
  public readonly models: ModelsResource;
  public readonly pipelines: PipelinesResource;

  private readonly client: Client;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;

  constructor(options: OpenParserOptions = {}) {
    const apiKey = options.apiKey ?? readEnv('OPENPARSER_API_KEY');
    if (!apiKey) {
      throw new OpenParserError(
        'Missing API key. Pass `new OpenParserClient({ apiKey })` or set the OPENPARSER_API_KEY environment variable.',
        { status: 0 }
      );
    }

    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const baseUrl = options.baseUrl ?? readEnv('OPENPARSER_BASE_URL') ?? DEFAULT_BASE_URL;
    const config: Config = createConfig({
      baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...buildTelemetryHeaders(),
        ...(options.defaultHeaders ?? {}),
      },
    });

    this.client = createClient(config);
    if (options.fetch) {
      this.client.setConfig({ fetch: options.fetch as never });
    }
    this.installTimeoutInterceptor();

    const dispatch = <T>(
      call: () => Promise<OperationResult<T>>,
      retryContext: RequestRetryContext
    ) => this._request(call, retryContext);
    this.parse = new ParseResource(this.client, dispatch);
    this.extract = new ExtractResource(this.client, dispatch);
    this.jobs = new JobsResource(this.client, dispatch);
    this.files = new FilesResource(this.client, dispatch);
    this.models = new ModelsResource(this.client, dispatch);
    this.pipelines = new PipelinesResource(this.client, dispatch);
  }

  getRawClient(): Client {
    return this.client;
  }

  private async _request<T>(
    call: () => Promise<OperationResult<T>>,
    retryContext: RequestRetryContext
  ): Promise<T> {
    const mayRetry = isRetryableRequest(retryContext);

    for (let attempt = 0; ; attempt++) {
      try {
        const result = await call();
        const response = result.response;
        if (!response && result.error != null) {
          throw result.error;
        }
        const status = response?.status ?? 0;
        const willRetry = mayRetry && isRetriableStatus(status) && attempt < this.maxRetries;
        if (response && !willRetry) assertJsonResponse(response);
        if (response && response.ok && result.data !== undefined) {
          return result.data;
        }
        if (willRetry) {
          await sleep(retryDelay(response, attempt));
          continue;
        }
        const envelope = asErrorResponse(result.error);
        const retryAfter = parseRetryAfter(response?.headers.get('retry-after') ?? null);
        throw errorFromResponse(status, envelope, retryAfter);
      } catch (err) {
        if (err instanceof OpenParserError) throw err;
        if (isAbortError(err)) throw err;
        if (mayRetry && attempt < this.maxRetries) {
          await sleep(backoff(attempt));
          continue;
        }
        throw err;
      }
    }
  }

  private installTimeoutInterceptor(): void {
    const timeoutMs = this.timeoutMs;
    if (timeoutMs <= 0) return;

    this.client.interceptors.request.use(async (req) => {
      return withRequestTimeout(req, timeoutMs).request;
    });
    this.client.interceptors.response.use(async (response, request) => {
      disposeRequestTimeout(request);
      return response;
    });
    this.client.interceptors.error.use(async (error, _response, request) => {
      disposeRequestTimeout(request);
      return error;
    });
  }
}

function assertJsonResponse(response: Response): void {
  if (response.status === 204) return;
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType === '' || contentType.includes('json') || contentType.includes('octet-stream')) {
    return;
  }
  throw new OpenParserError(
    `Expected a JSON response from the API but got Content-Type "${contentType}". ` +
      `This usually means \`baseUrl\` points at a non-API host. ` +
      `Set \`baseUrl\` to your OpenParser API root, e.g. "https://api.openparser.dev".`,
    { status: response.status }
  );
}

function retryDelay(response: Response | undefined, attempt: number): number {
  const retryAfterSec = parseRetryAfter(response?.headers.get('retry-after') ?? null);
  return retryAfterSec !== undefined ? retryAfterSec * 1000 : backoff(attempt);
}

function backoff(attempt: number): number {
  return 250 * 2 ** attempt;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(err: unknown): boolean {
  if (err instanceof OpenParserTimeoutError) return true;
  if (typeof err === 'object' && err !== null && 'name' in err) {
    return (err as { name: string }).name === 'AbortError';
  }
  return false;
}

function readEnv(name: string): string | undefined {
  // eslint-disable-next-line no-process-env
  if (typeof process !== 'undefined' && process.env) {
    // eslint-disable-next-line no-process-env
    const v = process.env[name];
    return v && v.length > 0 ? v : undefined;
  }
  return undefined;
}

export type { RequestRetryContext } from './lib/retry-policy';
export type { ErrorResponse };
