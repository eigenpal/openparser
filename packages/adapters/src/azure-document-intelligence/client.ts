import { countPdfPages } from '../shared/pdf-page-count';
import { readBoundedResponseText } from '../shared/read-bounded-response';
import {
  mapAzureDocumentIntelligenceToParsedDocument,
  type AzureDocumentIntelligenceAnalyzeResult,
} from './convert';
import { AzureDiError, AzureDocumentIntelligenceAdapterError } from './errors';
import { resolveAzureDiAnalyzeParams, type AzureParseOptions } from './options';
import { type AzureDiLayoutParsedDocument, type AzureDiReadParsedDocument } from './output';

export { AzureDiError } from './errors';
export { AZURE_DI_FEATURE_PARAM_BY_OPTION, resolveAzureDiAnalyzeParams } from './options';
export type { AzureParseOptions } from './options';

export const AZURE_DI_API_VERSION = '2024-11-30';
export const AZURE_DI_MAX_RESPONSE_BYTES = 64 * 1024 * 1024;
export const AZURE_DI_DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
export const AZURE_DI_DEFAULT_POLL_TIMEOUT_MS = 180_000;
export const AZURE_DI_DEFAULT_POLL_INTERVAL_MS = 2_000;
export const AZURE_DI_MAX_RETRY_AFTER_MS = 60_000;
/** Azure rejects images whose width or height exceeds this many pixels. */
export const AZURE_DI_MAX_IMAGE_SIDE_PX = 10_000;

export type AzureParseInput = {
  bytes: Uint8Array;
  mediaType: string;
  documentId: string;
  /** Provider-native Azure Document Intelligence model id. */
  modelId: string;
  outputContentFormat: 'markdown' | 'text';
  /** Optional analyze features / locale / pages. Omitted = previous defaults. */
  options?: AzureParseOptions;
  /**
   * Set when `bytes` is a shrunk copy of the caller's image: multiplies page
   * sizes and polygons so the result describes the original image.
   */
  coordinateScale?: { x: number; y: number };
  signal?: AbortSignal;
};

export type AzureParseOutput = {
  canonical: AzureDiLayoutParsedDocument | AzureDiReadParsedDocument;
  nativeResult: Record<string, unknown>;
};

export type HttpAzureDiClientOptions = {
  endpoint: string;
  apiKey: string;
  requestTimeoutMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  maxResponseBytes?: number;
  fetchImpl?: typeof fetch;
};

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, '');
}

function getHeader(headers: Headers, name: string): string | undefined {
  return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
}

function retryAfterMs(headers: Headers): number | undefined {
  const retryAfter = getHeader(headers, 'retry-after');
  if (!retryAfter) return undefined;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) {
    return Math.min(AZURE_DI_MAX_RETRY_AFTER_MS, Math.max(0, seconds * 1000));
  }

  const dateMs = Date.parse(retryAfter);
  if (Number.isFinite(dateMs)) {
    return Math.min(AZURE_DI_MAX_RETRY_AFTER_MS, Math.max(0, dateMs - Date.now()));
  }

  return undefined;
}

function parseAnalyzeResultId(operationLocation: string): string {
  const pathname = new URL(operationLocation).pathname;
  const marker = '/analyzeResults/';
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex === -1) {
    throw new AzureDiError('Azure Document Intelligence returned an invalid operation-location');
  }
  const resultId = pathname.slice(markerIndex + marker.length).split('/')[0];
  if (!resultId) {
    throw new AzureDiError(
      'Azure Document Intelligence operation-location did not include a result id'
    );
  }
  return decodeURIComponent(resultId);
}

async function resolveExpectedPages(bytes: Uint8Array, mediaType: string): Promise<number> {
  if (mediaType === 'application/pdf') {
    try {
      return await countPdfPages(bytes);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AzureDiError(message);
    }
  }
  if (
    mediaType === 'image/png' ||
    mediaType === 'image/jpeg' ||
    mediaType === 'image/tiff' ||
    mediaType === 'image/bmp' ||
    mediaType === 'image/heif'
  ) {
    return 1;
  }
  throw new AzureDiError(`unsupported media type for Azure Document Intelligence: ${mediaType}`);
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw new AzureDiError('Azure Document Intelligence request aborted', false);
  }
  let onAbort: (() => void) | undefined;
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(resolve, ms);
    onAbort = () => {
      clearTimeout(timeoutId);
      reject(new AzureDiError('Azure Document Intelligence request aborted', false));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    timeoutId.unref?.();
  }).finally(() => {
    if (onAbort) signal?.removeEventListener('abort', onAbort);
  });
}

async function withRequestTimeout<T>(
  operation: (requestSignal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  signal: AbortSignal | undefined,
  label: string
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let abortReject: ((error: AzureDiError) => void) | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(
        new AzureDiError(
          `Azure Document Intelligence ${label} timed out after ${timeoutMs}ms`,
          true,
          true
        )
      );
    }, timeoutMs);
  });

  const abortPromise = new Promise<never>((_, reject) => {
    abortReject = reject;
  });

  const onAbort = (): void => {
    controller.abort(signal?.reason);
    abortReject?.(new AzureDiError(`Azure Document Intelligence ${label} aborted`, false));
  };

  if (signal?.aborted) {
    onAbort();
  } else {
    signal?.addEventListener('abort', onAbort, { once: true });
  }

  try {
    return await Promise.race([operation(controller.signal), timeoutPromise, abortPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    abortReject = undefined;
    signal?.removeEventListener('abort', onAbort);
  }
}

async function readBoundedJson(
  response: Response,
  maxBytes: number
): Promise<Record<string, unknown>> {
  const body = await readBoundedResponseText(response, maxBytes);
  if (body.readFailed) {
    throw new AzureDiError('Azure Document Intelligence response body unreadable', true);
  }
  if (body.truncated) {
    throw new AzureDiError('Azure Document Intelligence response exceeded size limit', true);
  }
  if (!body.text?.trim()) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.text);
  } catch {
    throw new AzureDiError('Azure Document Intelligence response was not valid JSON', true);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AzureDiError('Azure Document Intelligence response was not a JSON object', true);
  }
  return parsed as Record<string, unknown>;
}

function asRecord(payload: unknown): Record<string, unknown> | null {
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;
}

function azureErrorMessage(payload: Record<string, unknown>, fallback: string): string {
  const error = asRecord(payload.error);
  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  const inner = asRecord(error?.innererror);
  const innerMessage = typeof inner?.message === 'string' ? inner.message.trim() : '';
  const combined =
    innerMessage && innerMessage !== message
      ? [message, innerMessage].filter(Boolean).join(': ')
      : message;
  return combined ? combined.slice(0, 500) : fallback;
}

/**
 * Most specific Azure error code (`innererror.code` before `code`), e.g.
 * `InvalidContentDimensions`. Restricted to identifier characters so it is
 * safe to log and return to callers.
 */
function azureErrorCode(error: Record<string, unknown> | null): string | undefined {
  const inner = asRecord(error?.innererror);
  for (const candidate of [inner?.code, error?.code]) {
    if (typeof candidate === 'string' && /^[A-Za-z][A-Za-z0-9_.]{0,63}$/.test(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Codes Azure reports, on a 400 or a failed analysis, when the document itself
 * is unusable. Other 400s (bad parameters, API version) are our request's
 * fault, so they stay ordinary provider errors.
 */
const AZURE_INPUT_REJECTION_CODES = new Set([
  'InvalidContent',
  'InvalidContentDimensions',
  'InvalidContentLength',
  'UnsupportedContent',
]);

function isAzureInputRejection(code: string | undefined): boolean {
  return code !== undefined && AZURE_INPUT_REJECTION_CODES.has(code);
}

/**
 * Scale Azure pixel geometry in place: page `width`/`height` and every
 * `polygon` (flat `[x, y, ...]` or `{ x, y }` points) anywhere in the result.
 */
function scaleAnalyzeResult(
  analyzeResult: Record<string, unknown>,
  scale: { x: number; y: number }
): void {
  const pages = Array.isArray(analyzeResult.pages) ? analyzeResult.pages : [];
  for (const page of pages) {
    const node = asRecord(page);
    if (!node) continue;
    if (typeof node.width === 'number') node.width *= scale.x;
    if (typeof node.height === 'number') node.height *= scale.y;
  }
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    const node = asRecord(value);
    if (!node) return;
    for (const [key, child] of Object.entries(node)) {
      if (key === 'polygon' && Array.isArray(child)) {
        node.polygon = child.map((point, index) => {
          if (typeof point === 'number') return point * (index % 2 === 0 ? scale.x : scale.y);
          const xy = asRecord(point);
          return xy && typeof xy.x === 'number' && typeof xy.y === 'number'
            ? { ...xy, x: xy.x * scale.x, y: xy.y * scale.y }
            : point;
        });
      } else {
        visit(child);
      }
    }
  };
  visit(analyzeResult);
}

function buildAnalyzeUrl(
  endpoint: string,
  modelId: string,
  outputContentFormat: string,
  analyzeParams: {
    features?: string;
    locale?: string;
    pages?: string;
  }
): string {
  const url = new URL(
    `${normalizeEndpoint(endpoint)}/documentintelligence/documentModels/${encodeURIComponent(modelId)}:analyze`
  );
  url.searchParams.set('api-version', AZURE_DI_API_VERSION);
  url.searchParams.set('outputContentFormat', outputContentFormat);
  // Production always requests UTF-16 so adapter spans are identity (JS String offsets).
  url.searchParams.set('stringIndexType', 'utf16CodeUnit');
  if (analyzeParams.features) {
    url.searchParams.set('features', analyzeParams.features);
  }
  if (analyzeParams.locale) {
    url.searchParams.set('locale', analyzeParams.locale);
  }
  if (analyzeParams.pages) {
    url.searchParams.set('pages', analyzeParams.pages);
  }
  return url.toString();
}

/**
 * Production Azure Document Intelligence HTTP client (API 2024-11-30).
 */
export function createHttpAzureDiClient(options: HttpAzureDiClientOptions): {
  parse(input: AzureParseInput): Promise<AzureParseOutput>;
} {
  const endpoint = normalizeEndpoint(options.endpoint);
  const requestTimeoutMs = options.requestTimeoutMs ?? AZURE_DI_DEFAULT_REQUEST_TIMEOUT_MS;
  const pollTimeoutMs = options.pollTimeoutMs ?? AZURE_DI_DEFAULT_POLL_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? AZURE_DI_DEFAULT_POLL_INTERVAL_MS;
  const maxResponseBytes = options.maxResponseBytes ?? AZURE_DI_MAX_RESPONSE_BYTES;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async parse(input: AzureParseInput): Promise<AzureParseOutput> {
      const documentPageCount = await resolveExpectedPages(input.bytes, input.mediaType);
      const analyzeParams = resolveAzureDiAnalyzeParams({
        documentPageCount,
        options: input.options,
        modelId: input.modelId,
      });
      const analyzeUrl = buildAnalyzeUrl(endpoint, input.modelId, input.outputContentFormat, {
        features: analyzeParams.features,
        locale: analyzeParams.locale,
        pages: analyzeParams.pages,
      });
      const expectedPages = analyzeParams.expectedPageCount;

      const submitStartedAt = Date.now();
      let submitAttempt = 0;
      let operationLocation: string | undefined;

      while (!operationLocation) {
        submitAttempt += 1;
        let response: Response;
        try {
          response = await withRequestTimeout(
            (requestSignal) =>
              fetchImpl(analyzeUrl, {
                method: 'POST',
                headers: {
                  'Ocp-Apim-Subscription-Key': options.apiKey,
                  'Content-Type': input.mediaType,
                },
                body: input.bytes,
                signal: requestSignal,
              }),
            requestTimeoutMs,
            input.signal,
            `submit attempt ${submitAttempt}`
          );
        } catch (error) {
          if (error instanceof AzureDiError) throw error;
          if (input.signal?.aborted) {
            throw new AzureDiError('Azure Document Intelligence request aborted', false);
          }
          throw new AzureDiError(
            error instanceof Error ? error.message : 'Azure Document Intelligence transport failed',
            true,
            true
          );
        }

        if (response.status === 202) {
          operationLocation = getHeader(response.headers, 'operation-location');
          if (!operationLocation) {
            throw new AzureDiError(
              'Azure Document Intelligence response did not include operation-location',
              false,
              true
            );
          }
          break;
        }

        if (response.status === 429) {
          const delayMs = retryAfterMs(response.headers) ?? pollIntervalMs;
          if (Date.now() - submitStartedAt + delayMs > pollTimeoutMs) {
            throw new AzureDiError(
              `Azure Document Intelligence submit was not accepted after ${pollTimeoutMs}ms`,
              true
            );
          }
          await sleep(delayMs, input.signal);
          continue;
        }
        if (isRetryableStatus(response.status)) {
          throw new AzureDiError(
            `Azure Document Intelligence submit failed HTTP ${response.status}`,
            true,
            true
          );
        }

        const payload = await readBoundedJson(response, 8_192).catch(
          (): Record<string, unknown> => ({})
        );
        const code = azureErrorCode(asRecord(payload.error));
        throw new AzureDiError(
          `Azure Document Intelligence submit failed HTTP ${response.status}: ${azureErrorMessage(payload, 'unknown error')}`,
          false,
          false,
          { status: response.status, code, inputRejected: isAzureInputRejection(code) }
        );
      }

      const resultId = parseAnalyzeResultId(operationLocation);
      let lastProgressAt = Date.now();
      let lastUpdatedDateTime: string | undefined;
      let lastStatus: string | undefined;
      let pollCount = 0;
      let nextPollDelayMs = 0;

      while (true) {
        if (Date.now() - lastProgressAt > pollTimeoutMs) {
          throw new AzureDiError(
            `Azure Document Intelligence stalled after ${pollTimeoutMs}ms without progress (resultId=${resultId}, status=${lastStatus ?? 'unknown'})`,
            true,
            true
          );
        }

        await sleep(nextPollDelayMs, input.signal);

        let pollResponse: Response;
        try {
          pollResponse = await withRequestTimeout(
            (requestSignal) =>
              fetchImpl(operationLocation!, {
                method: 'GET',
                headers: {
                  'Ocp-Apim-Subscription-Key': options.apiKey,
                },
                signal: requestSignal,
              }),
            requestTimeoutMs,
            input.signal,
            `poll resultId=${resultId} poll=${pollCount + 1}`
          );
        } catch (error) {
          if (error instanceof AzureDiError) {
            if (input.signal?.aborted) {
              throw new AzureDiError('Azure Document Intelligence request aborted', false);
            }
            throw new AzureDiError(error.message, error.retryable, true);
          }
          if (input.signal?.aborted) {
            throw new AzureDiError('Azure Document Intelligence request aborted', false);
          }
          throw new AzureDiError(
            error instanceof Error ? error.message : 'Azure Document Intelligence poll failed',
            true,
            true
          );
        }
        pollCount += 1;

        if (isRetryableStatus(pollResponse.status)) {
          nextPollDelayMs = retryAfterMs(pollResponse.headers) ?? pollIntervalMs;
          continue;
        }

        if (!pollResponse.ok) {
          const payload = await readBoundedJson(pollResponse, 8_192).catch(
            (): Record<string, unknown> => ({})
          );
          throw new AzureDiError(
            `Azure Document Intelligence poll failed HTTP ${pollResponse.status}: ${azureErrorMessage(payload, 'unknown error')}`,
            false,
            false,
            {
              status: pollResponse.status,
              code: azureErrorCode(asRecord(payload.error)),
            }
          );
        }

        let operation: Record<string, unknown>;
        try {
          operation = await readBoundedJson(pollResponse, maxResponseBytes);
        } catch (error) {
          if (error instanceof AzureDiError) {
            throw new AzureDiError(error.message, error.retryable, true);
          }
          throw error;
        }
        const status = operation.status;
        const updated =
          typeof operation.lastUpdatedDateTime === 'string'
            ? operation.lastUpdatedDateTime
            : undefined;
        nextPollDelayMs = retryAfterMs(pollResponse.headers) ?? pollIntervalMs;

        if (status !== lastStatus || updated !== lastUpdatedDateTime) {
          lastStatus = typeof status === 'string' ? status : undefined;
          lastUpdatedDateTime = updated;
          lastProgressAt = Date.now();
        }

        if (status === 'succeeded') {
          const analyzeResult = operation.analyzeResult;
          if (!analyzeResult || typeof analyzeResult !== 'object' || Array.isArray(analyzeResult)) {
            throw new AzureDiError(
              'Azure Document Intelligence succeeded without analyzeResult',
              false,
              true
            );
          }
          if (input.coordinateScale) {
            scaleAnalyzeResult(analyzeResult as Record<string, unknown>, input.coordinateScale);
          }
          const nativeResult = operation;
          let canonical: AzureDiLayoutParsedDocument | AzureDiReadParsedDocument;
          try {
            canonical = mapAzureDocumentIntelligenceToParsedDocument({
              documentId: input.documentId,
              pageCount: expectedPages,
              analyzeResult: analyzeResult as AzureDocumentIntelligenceAnalyzeResult,
              model: input.modelId,
              version: AZURE_DI_API_VERSION,
            });
          } catch (error) {
            if (error instanceof AzureDocumentIntelligenceAdapterError) {
              throw new AzureDiError(error.message, error.retryable, true);
            }
            throw error;
          }
          return {
            canonical,
            nativeResult,
          };
        }

        if (status === 'failed' || status === 'canceled') {
          const code = azureErrorCode(asRecord(operation.error));
          throw new AzureDiError(
            `Azure Document Intelligence analysis ${String(status)}: ${azureErrorMessage(operation, 'unknown error')}`,
            false,
            false,
            { code, inputRejected: isAzureInputRejection(code) }
          );
        }
      }
    },
  };
}
