import { countPdfPages } from '../shared/pdf-page-count';
import { readBoundedResponseText } from '../shared/read-bounded-response';
import { mapMistralOcrResponseToParsedDocument } from './convert';
import { MistralAdapterError, MistralOcrError } from './errors';
import { toMistralOcrNativeRequestBody, type MistralOcrRequestOptions } from './options';
import { type MistralOcrParsedDocument } from './output';

export const MISTRAL_OCR_DEFAULT_BASE_URL = 'https://api.mistral.ai';
export const MISTRAL_OCR_MAX_RESPONSE_BYTES = 64 * 1024 * 1024;
export const MISTRAL_OCR_DEFAULT_TIMEOUT_MS = 300_000;

export type MistralParseInput = {
  bytes: Uint8Array;
  mediaType: string;
  documentId: string;
  /** Provider-native Mistral model id (for example `mistral-ocr-4-0`). */
  model: string;
  options?: MistralOcrRequestOptions;
  signal?: AbortSignal;
};

export type MistralParseOutput = {
  canonical: MistralOcrParsedDocument;
  nativeResult: Record<string, unknown>;
};

export type HttpMistralOcrClientOptions = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  fetchImpl?: typeof fetch;
};

export { MistralOcrError } from './errors';

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function toDataUrl(bytes: Uint8Array, mediaType: string): string {
  return `data:${mediaType};base64,${Buffer.from(bytes).toString('base64')}`;
}

function buildDocumentPayload(bytes: Uint8Array, mediaType: string): Record<string, string> {
  const dataUrl = toDataUrl(bytes, mediaType);
  if (mediaType === 'application/pdf') {
    return { type: 'document_url', document_url: dataUrl };
  }
  if (mediaType === 'image/png' || mediaType === 'image/jpeg' || mediaType === 'image/webp') {
    return { type: 'image_url', image_url: dataUrl };
  }
  throw new MistralOcrError(`unsupported media type for Mistral OCR: ${mediaType}`);
}

async function resolveExpectedPages(bytes: Uint8Array, mediaType: string): Promise<number> {
  if (mediaType === 'application/pdf') {
    try {
      return await countPdfPages(bytes);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new MistralOcrError(message);
    }
  }
  if (mediaType === 'image/png' || mediaType === 'image/jpeg' || mediaType === 'image/webp') {
    return 1;
  }
  throw new MistralOcrError(`unsupported media type for Mistral OCR: ${mediaType}`);
}

async function withRequestTimeout<T>(
  operation: (requestSignal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  signal: AbortSignal | undefined,
  label: string
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let abortReject: ((error: MistralOcrError) => void) | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(
        new MistralOcrError(`Mistral OCR ${label} timed out after ${timeoutMs}ms`, true, true)
      );
    }, timeoutMs);
  });

  const abortPromise = new Promise<never>((_, reject) => {
    abortReject = reject;
  });

  const onAbort = (): void => {
    controller.abort(signal?.reason);
    abortReject?.(new MistralOcrError(`Mistral OCR ${label} aborted`, false));
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
    throw new MistralOcrError('Mistral OCR response body unreadable', true, true);
  }
  if (body.truncated) {
    throw new MistralOcrError('Mistral OCR response exceeded size limit', true, true);
  }
  if (!body.text?.trim()) {
    throw new MistralOcrError('Mistral OCR response was empty', true, true);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.text);
  } catch {
    throw new MistralOcrError('Mistral OCR response was not valid JSON', true, true);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new MistralOcrError('Mistral OCR response was not a JSON object', true, true);
  }
  return parsed as Record<string, unknown>;
}

function mistralErrorMessage(payload: Record<string, unknown>, fallback: string): string {
  const message = payload.message;
  if (typeof message === 'string' && message.trim()) {
    return message.trim().slice(0, 500);
  }
  const error = payload.error;
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    const nested = (error as Record<string, unknown>).message;
    if (typeof nested === 'string' && nested.trim()) {
      return nested.trim().slice(0, 500);
    }
  }
  return fallback;
}

/**
 * Production Mistral OCR HTTP client: POST /v1/ocr, map via adapter convert.
 */
export function createHttpMistralOcrClient(options: HttpMistralOcrClientOptions): {
  parse(input: MistralParseInput): Promise<MistralParseOutput>;
} {
  const baseUrl = (options.baseUrl ?? MISTRAL_OCR_DEFAULT_BASE_URL).replace(/\/+$/, '');
  const timeoutMs = options.timeoutMs ?? MISTRAL_OCR_DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? MISTRAL_OCR_MAX_RESPONSE_BYTES;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async parse(input: MistralParseInput): Promise<MistralParseOutput> {
      const expectedPages = await resolveExpectedPages(input.bytes, input.mediaType);
      const body = toMistralOcrNativeRequestBody({
        model: input.model,
        document: buildDocumentPayload(input.bytes, input.mediaType),
        options: input.options,
      });

      let response: Response;
      try {
        response = await withRequestTimeout(
          (requestSignal) =>
            fetchImpl(`${baseUrl}/v1/ocr`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${options.apiKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify(body),
              signal: requestSignal,
            }),
          timeoutMs,
          input.signal,
          'request'
        );
      } catch (error) {
        if (error instanceof MistralOcrError) throw error;
        if (input.signal?.aborted) {
          throw new MistralOcrError('Mistral OCR request aborted', false);
        }
        throw new MistralOcrError(
          error instanceof Error ? error.message : 'Mistral OCR transport failed',
          true,
          true
        );
      }

      if (isRetryableStatus(response.status)) {
        throw new MistralOcrError(
          `Mistral OCR request failed HTTP ${response.status}`,
          true,
          response.status !== 429
        );
      }
      if (!response.ok) {
        const payload = await readBoundedJson(response, 8_192).catch(() => null);
        const message = payload
          ? mistralErrorMessage(payload, `HTTP ${response.status}`)
          : `HTTP ${response.status}`;
        throw new MistralOcrError(`Mistral OCR request failed: ${message}`, false);
      }

      const nativeResult = await readBoundedJson(response, maxResponseBytes);
      let canonical: MistralOcrParsedDocument;
      try {
        canonical = mapMistralOcrResponseToParsedDocument({
          documentId: input.documentId,
          expectedPages,
          payload: nativeResult,
          model: input.model,
        });
      } catch (error) {
        if (error instanceof MistralAdapterError) {
          throw new MistralOcrError(error.message, error.retryable, true);
        }
        throw error;
      }

      return {
        canonical,
        nativeResult,
      };
    },
  };
}
