/**
 * Google Document AI ProcessDocument client (Enterprise OCR).
 *
 * Auth: Application Default Credentials / Workload Identity Federation via
 * `google-auth-library` — no service-account JSON file assumptions.
 */
import { GoogleAuth } from 'google-auth-library';
import { readBoundedResponseText } from '../shared/read-bounded-response';
import { mapGoogleDocumentAiToParsedDocument, type GoogleDocumentAiProcessorType } from './convert';
import { GoogleDocumentAiAdapterError } from './errors';
import { toGoogleDocumentAiProcessOptions, type GoogleDocumentAiOcrOptions } from './options';
import { type GoogleDocAiOcrParsedDocument } from './output';

export { toGoogleDocumentAiProcessOptions } from './options';
export type { GoogleDocumentAiOcrOptions } from './options';

export const GOOGLE_DOCAI_PROCESSOR_TYPE: GoogleDocumentAiProcessorType = 'OCR_PROCESSOR';
export const GOOGLE_DOCAI_API_VERSION = 'v1';
export const GOOGLE_DOCAI_DEFAULT_TIMEOUT_MS = 120_000;
/** Rasterized OCR (`native_pdf_parsing=false`) can take several minutes on dense PDFs. */
export const GOOGLE_DOCAI_RASTER_OCR_TIMEOUT_MS = 600_000;
/**
 * Hard cap on ProcessDocument response bodies (bytes).
 * Dense PDFs near the supported 15-page synchronous limit routinely exceed
 * 16 MiB without symbol output and 64 MiB with symbol output enabled.
 */
export const GOOGLE_DOCAI_MAX_RESPONSE_BYTES = 128 * 1024 * 1024;
/** Synchronous Enterprise OCR ProcessDocument PDF page cap (Google Document AI). */
export const GOOGLE_DOCAI_SYNC_MAX_PDF_PAGES = 15;
export const GOOGLE_DOCAI_MAX_ERROR_CHARS = 500;
export const GOOGLE_DOCAI_CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

export type GoogleDocumentAiParseInput = {
  bytes: Uint8Array;
  mediaType: string;
  documentId: string;
  jobId?: string;
  /** Overrides the client-default processor version for this request. */
  processorVersionId?: string;
  /**
   * When true, ProcessDocument omits page image rasters from the response.
   * Omitted leaves the Google API default (page images included).
   */
  imagelessMode?: boolean;
  options?: GoogleDocumentAiOcrOptions;
  signal?: AbortSignal;
};

export type GoogleDocumentAiParseOutput = {
  canonical: GoogleDocAiOcrParsedDocument;
  /** Untouched ProcessDocument document payload + processor metadata. */
  nativeResult: Record<string, unknown>;
};

export type GoogleDocumentAiClient = {
  parse(input: GoogleDocumentAiParseInput): Promise<GoogleDocumentAiParseOutput>;
};

export type GoogleAuthHeaders = {
  getRequestHeaders(url?: string | URL): Promise<Headers | Record<string, string>>;
};

export type GoogleDocumentAiClientOptions = {
  projectId: string;
  location: string;
  processorId: string;
  processorVersionId: string;
  processorType?: GoogleDocumentAiProcessorType;
  timeoutMs?: number;
  maxResponseBytes?: number;
  /** Test seam; production uses ADC/WIF via GoogleAuth (no keyFilename / credentials JSON). */
  auth?: GoogleAuthHeaders;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
};

export class GoogleDocumentAiError extends Error {
  readonly retryable: boolean;
  readonly dispatchAmbiguous: boolean;
  readonly httpStatus?: number;
  readonly providerCode?: string;

  constructor(
    message: string,
    options?: {
      retryable?: boolean;
      httpStatus?: number;
      providerCode?: string;
      dispatchAmbiguous?: boolean;
      cause?: unknown;
    }
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'GoogleDocumentAiError';
    this.retryable = options?.retryable ?? false;
    this.dispatchAmbiguous = options?.dispatchAmbiguous ?? false;
    this.httpStatus = options?.httpStatus;
    this.providerCode = options?.providerCode;
  }
}

/**
 * Production Document AI client. Pins processor version, authenticates via ADC/WIF,
 * bounds response size, and classifies retryable transport failures.
 */
export function createGoogleDocumentAiClient(
  options: GoogleDocumentAiClientOptions
): GoogleDocumentAiClient {
  const projectId = requireNonEmpty(options.projectId, 'projectId');
  const location = requireNonEmpty(options.location, 'location');
  const processorId = requireNonEmpty(options.processorId, 'processorId');
  const defaultProcessorVersionId = requireNonEmpty(
    options.processorVersionId,
    'processorVersionId'
  );
  const processorType = options.processorType ?? GOOGLE_DOCAI_PROCESSOR_TYPE;
  const timeoutMs = options.timeoutMs ?? GOOGLE_DOCAI_DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? GOOGLE_DOCAI_MAX_RESPONSE_BYTES;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('timeoutMs must be positive');
  }
  if (!Number.isInteger(maxResponseBytes) || maxResponseBytes < 1) {
    throw new TypeError('maxResponseBytes must be a positive integer');
  }

  const auth: GoogleAuthHeaders =
    options.auth ??
    new GoogleAuth({
      scopes: [GOOGLE_DOCAI_CLOUD_PLATFORM_SCOPE],
      projectId,
      // Intentionally omit keyFilename / credentials — rely on ADC / WIF / metadata.
    });

  const endpoint = `https://${location}-documentai.googleapis.com`;

  return {
    async parse(input: GoogleDocumentAiParseInput): Promise<GoogleDocumentAiParseOutput> {
      if (!(input.bytes instanceof Uint8Array) || input.bytes.byteLength < 1) {
        throw new GoogleDocumentAiError('Google Document AI requires non-empty document bytes');
      }
      if (!input.mediaType?.trim()) {
        throw new GoogleDocumentAiError('Google Document AI requires mediaType');
      }
      if (!input.documentId?.trim()) {
        throw new GoogleDocumentAiError('Google Document AI requires documentId');
      }
      const processorVersionId = requireNonEmpty(
        input.processorVersionId ?? defaultProcessorVersionId,
        'processorVersionId'
      );
      const processorName =
        `projects/${projectId}/locations/${location}/processors/${processorId}` +
        `/processorVersions/${processorVersionId}`;
      const processUrl = `${endpoint}/${GOOGLE_DOCAI_API_VERSION}/${processorName}:process`;

      // Rasterized OCR (native PDF parsing off) routinely exceeds the default
      // sync budget on multi-page PDFs; keep the explicit client timeout as a floor.
      const requestTimeoutMs =
        input.options?.native_pdf_parsing === false
          ? Math.max(timeoutMs, GOOGLE_DOCAI_RASTER_OCR_TIMEOUT_MS)
          : timeoutMs;
      const signals: AbortSignal[] = [AbortSignal.timeout(requestTimeoutMs)];
      if (input.signal) signals.push(input.signal);
      const signal = signals.length === 1 ? signals[0]! : AbortSignal.any(signals);

      let headers: Headers | Record<string, string>;
      try {
        headers = await auth.getRequestHeaders(processUrl);
      } catch (error) {
        throw new GoogleDocumentAiError('Google ADC/WIF authentication failed', {
          retryable: true,
          cause: error,
        });
      }

      const requestHeaders = mergeHeaders(headers, {
        'Content-Type': 'application/json',
        'x-goog-user-project': projectId,
      });

      // Never log rawDocument bytes or Authorization material.
      const processOptions = toGoogleDocumentAiProcessOptions(input.options);
      const body = JSON.stringify({
        rawDocument: {
          content: Buffer.from(input.bytes).toString('base64'),
          mimeType: input.mediaType,
        },
        ...(input.imagelessMode !== undefined ? { imagelessMode: input.imagelessMode } : {}),
        ...(processOptions ? { processOptions } : {}),
      });

      let response: Response;
      try {
        response = await fetchImpl(processUrl, {
          method: 'POST',
          headers: requestHeaders,
          body,
          signal,
        });
      } catch (error) {
        if (isAbortError(error)) {
          throw new GoogleDocumentAiError('Google Document AI request aborted or timed out', {
            retryable: true,
            dispatchAmbiguous: true,
            cause: error,
          });
        }
        throw new GoogleDocumentAiError('Google Document AI request failed', {
          retryable: true,
          dispatchAmbiguous: true,
          cause: error,
        });
      }

      if (!response.ok) {
        throw await classifyGoogleHttpError(response, maxResponseBytes);
      }

      const { text, truncated } = await readBoundedResponseText(response, maxResponseBytes);
      if (text === null) {
        throw new GoogleDocumentAiError('Google Document AI returned an empty body', {
          httpStatus: response.status,
          dispatchAmbiguous: true,
        });
      }
      if (truncated) {
        throw new GoogleDocumentAiError(
          `Google Document AI response exceeded ${maxResponseBytes} bytes`,
          { httpStatus: response.status, retryable: false, dispatchAmbiguous: true }
        );
      }

      let payload: unknown;
      try {
        payload = JSON.parse(text) as unknown;
      } catch (error) {
        throw new GoogleDocumentAiError('Google Document AI returned non-JSON body', {
          httpStatus: response.status,
          dispatchAmbiguous: true,
          cause: error,
        });
      }

      if (!payload || typeof payload !== 'object') {
        throw new GoogleDocumentAiError('Google Document AI returned an invalid payload', {
          dispatchAmbiguous: true,
        });
      }

      const document = (payload as Record<string, unknown>).document;
      if (!document || typeof document !== 'object') {
        throw new GoogleDocumentAiError('Google Document AI returned no document', {
          dispatchAmbiguous: true,
        });
      }

      const documentRecord = document as Record<string, unknown>;
      const pages = documentRecord.pages;
      if (!Array.isArray(pages) || pages.length < 1) {
        throw new GoogleDocumentAiError('Google Document AI returned no document pages', {
          dispatchAmbiguous: true,
        });
      }

      const nativeResult: Record<string, unknown> = {
        processor_version_id: processorVersionId,
        processor_type: processorType,
        page_count: pages.length,
        document: documentRecord,
      };

      try {
        const canonical = mapGoogleDocumentAiToParsedDocument({
          documentId: input.documentId,
          response: {
            processor_type: processorType,
            page_count: pages.length,
            document: documentRecord,
            model: processorType,
            version: processorVersionId,
          },
        });
        return {
          canonical,
          nativeResult,
        };
      } catch (error) {
        if (error instanceof GoogleDocumentAiAdapterError) {
          throw new GoogleDocumentAiError(error.message, {
            retryable: error.retryable,
            dispatchAmbiguous: true,
            cause: error,
          });
        }
        throw error;
      }
    },
  };
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new TypeError(`${field} is required`);
  return trimmed;
}

function mergeHeaders(
  base: Headers | Record<string, string>,
  extra: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  if (base instanceof Headers) {
    base.forEach((value, key) => {
      out[key] = value;
    });
  } else {
    Object.assign(out, base);
  }
  Object.assign(out, extra);
  return out;
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: unknown }).name;
  return name === 'AbortError' || name === 'TimeoutError';
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function classifyGoogleHttpError(
  response: Response,
  maxResponseBytes: number
): Promise<GoogleDocumentAiError> {
  const { text } = await readBoundedResponseText(response, Math.min(8_192, maxResponseBytes));
  const sanitized = sanitizeProviderMessage(text);
  const providerCode = readGoogleErrorStatus(text) ?? `http_${response.status}`;
  return new GoogleDocumentAiError(
    sanitized
      ? `Google Document AI HTTP ${response.status}: ${sanitized}`
      : `Google Document AI HTTP ${response.status}`,
    {
      httpStatus: response.status,
      providerCode,
      retryable: isRetryableHttpStatus(response.status),
      dispatchAmbiguous: response.status !== 429 && isRetryableHttpStatus(response.status),
    }
  );
}

function readGoogleErrorStatus(text: string | null): string | undefined {
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as {
      error?: { status?: unknown; code?: unknown };
    };
    const status = parsed.error?.status;
    if (typeof status === 'string' && status.trim()) return status.trim().slice(0, 64);
    const code = parsed.error?.code;
    if (typeof code === 'number') return String(code);
  } catch {
    // ignore non-JSON error bodies
  }
  return undefined;
}

function sanitizeProviderMessage(text: string | null): string | undefined {
  if (!text) return undefined;
  let message = text;
  try {
    const parsed = JSON.parse(text) as { error?: { message?: unknown } };
    if (typeof parsed.error?.message === 'string') {
      message = parsed.error.message;
    }
  } catch {
    // keep raw text (bounded below)
  }
  message = message
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, '[redacted]')
    .replace(/[A-Za-z0-9+/]{80,}={0,2}/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim();
  if (!message) return undefined;
  return message.slice(0, GOOGLE_DOCAI_MAX_ERROR_CHARS);
}
