import { describe, expect, test } from 'bun:test';
import {
  OpenParserAuthError,
  OpenParserClient,
  OpenParserNotFoundError,
  OpenParserRateLimitError,
  OpenParserTimeoutError,
  OpenParserValidationError,
} from '../src';

function abortError(signal: AbortSignal): unknown {
  if (signal.reason !== undefined) return signal.reason;
  return new DOMException('The operation was aborted.', 'AbortError');
}

function hangingFetch(): typeof globalThis.fetch {
  return async (input: Request | string | URL) => {
    const req = input instanceof Request ? input : new Request(input.toString());
    return new Promise<Response>((_resolve, reject) => {
      if (req.signal.aborted) {
        reject(abortError(req.signal));
        return;
      }
      req.signal.addEventListener('abort', () => reject(abortError(req.signal)), {
        once: true,
      });
    });
  };
}

interface MockResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

function mockFetch(
  responses: MockResponse[],
  capturedRequests?: {
    url: string;
    method: string;
    auth: string | null;
    body?: string;
    headers?: Record<string, string>;
  }[]
): typeof globalThis.fetch {
  let i = 0;
  return async (input: Request | string | URL): Promise<Response> => {
    const req = input instanceof Request ? input : new Request(input.toString());
    const r = responses[i] ?? responses[responses.length - 1];
    if (i < responses.length - 1) i += 1;
    if (capturedRequests) {
      const headers: Record<string, string> = {};
      req.headers.forEach((v, k) => {
        headers[k.toLowerCase()] = v;
      });
      capturedRequests.push({
        url: req.url,
        method: req.method,
        auth: req.headers.get('Authorization'),
        body: req.body ? await req.text() : undefined,
        headers,
      });
    }
    return new Response(r.body !== undefined ? JSON.stringify(r.body) : null, {
      status: r.status,
      headers: { 'content-type': 'application/json', ...(r.headers ?? {}) },
    });
  };
}

describe('OpenParserClient', () => {
  test('attaches bearer auth and telemetry headers', async () => {
    const captured: { auth: string | null; headers?: Record<string, string> }[] = [];
    const client = new OpenParserClient({
      apiKey: 'eg_test_key',
      baseUrl: 'https://api.openparser.dev',
      fetch: mockFetch([{ status: 200, body: { data: [] } }], captured),
      maxRetries: 0,
    });

    await client.models.ocr();

    expect(captured[0]?.auth).toBe('Bearer eg_test_key');
    expect(captured[0]?.headers?.['x-openparser-sdk']).toBe('typescript');
    expect(captured[0]?.headers?.['user-agent']).toStartWith('openparser-sdk-typescript/');
  });

  test('parse.sync sends multipart with idempotency key', async () => {
    const captured: {
      url: string;
      method: string;
      headers?: Record<string, string>;
      body?: string;
    }[] = [];
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      fetch: mockFetch(
        [{ status: 200, body: { format: 'openparser@1', page_count: 1, pages: [] } }],
        captured
      ),
      maxRetries: 0,
    });

    const file = new File([new Uint8Array([1, 2, 3])], 'doc.pdf', { type: 'application/pdf' });
    await client.parse.sync({ ocr_model: 'paddleocr-vl-1.6' }, file, {
      idempotencyKey: 'idem-123',
    });

    expect(captured[0]?.method).toBe('POST');
    expect(captured[0]?.url).toContain('/parse');
    expect(captured[0]?.headers?.['idempotency-key']).toBe('idem-123');
    expect(captured[0]?.headers?.['content-type']).toMatch(/^multipart\/form-data/);
  });

  test('401, 404, 429, and 400 responses map to typed errors', async () => {
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      fetch: mockFetch([
        {
          status: 401,
          body: {
            error: {
              code: 'unauthorized',
              message: 'invalid',
              request_id: 'req_1',
              retryable: false,
            },
          },
        },
        {
          status: 404,
          body: {
            error: {
              code: 'job_not_found',
              message: 'missing',
              request_id: 'req_2',
              retryable: false,
            },
          },
        },
        {
          status: 429,
          body: {
            error: {
              code: 'rate_limited',
              message: 'rate',
              request_id: 'req_3',
              retryable: true,
            },
          },
          headers: { 'retry-after': '12' },
        },
        {
          status: 400,
          body: {
            error: {
              code: 'malformed_request',
              message: 'bad input',
              request_id: 'req_4',
              retryable: false,
            },
          },
        },
      ]),
      maxRetries: 0,
    });

    await expect(client.models.ocr()).rejects.toBeInstanceOf(OpenParserAuthError);
    await expect(client.jobs.get('missing')).rejects.toBeInstanceOf(OpenParserNotFoundError);
    await expect(client.models.ocr()).rejects.toBeInstanceOf(OpenParserRateLimitError);
    await expect(client.models.ocr()).rejects.toBeInstanceOf(OpenParserValidationError);
  });

  test('retries retriable responses', async () => {
    const captured: { url: string }[] = [];
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      fetch: mockFetch(
        [
          {
            status: 503,
            body: {
              error: {
                code: 'service_unavailable',
                message: 'down',
                request_id: 'req_5',
                retryable: true,
              },
            },
          },
          { status: 200, body: { data: [] } },
        ],
        captured
      ),
      maxRetries: 2,
    });

    const result = await client.models.ocr();
    expect(result.data).toEqual([]);
    expect(captured).toHaveLength(2);
  });

  test('reuses the generated idempotency key across admission retries', async () => {
    const captured: { headers?: Record<string, string> }[] = [];
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      fetch: mockFetch(
        [
          {
            status: 503,
            body: {
              error: {
                code: 'service_unavailable',
                message: 'down',
                request_id: 'req_6',
                retryable: true,
              },
            },
          },
          { status: 202, body: { id: '00000000-0000-4000-8000-000000000001', status: 'queued' } },
        ],
        captured
      ),
      maxRetries: 1,
    });

    await client.parse.async(
      { ocr_model: 'paddleocr-vl-1.6' },
      new File([new Uint8Array([1])], 'doc.pdf', { type: 'application/pdf' })
    );

    expect(captured).toHaveLength(2);
    expect(captured[0]?.headers?.['idempotency-key']).toBeTruthy();
    expect(captured[1]?.headers?.['idempotency-key']).toBe(
      captured[0]?.headers?.['idempotency-key']
    );
  });

  test('requires api key', () => {
    expect(() => new OpenParserClient({ apiKey: '' })).toThrow(/Missing API key/);
  });

  test('rejects a hanging fetch after timeoutMs', async () => {
    const timeoutMs = 50;
    const startedAt = Date.now();
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      timeoutMs,
      maxRetries: 0,
      fetch: hangingFetch(),
    });

    await expect(client.models.ocr()).rejects.toBeInstanceOf(OpenParserTimeoutError);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(timeoutMs - 5);
    expect(Date.now() - startedAt).toBeLessThan(timeoutMs + 250);
  });

  test('caller abort cancels a hanging fetch before timeoutMs', async () => {
    const caller = new AbortController();
    let observedSignal: AbortSignal | undefined;
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      timeoutMs: 60_000,
      maxRetries: 0,
      fetch: async (input) => {
        const req = input instanceof Request ? input : new Request(input.toString());
        observedSignal = req.signal;
        return hangingFetch()(req);
      },
    });

    const promise = client.models.ocr({ signal: caller.signal });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(observedSignal?.aborted).toBe(false);

    const reason = new Error('caller cancelled');
    caller.abort(reason);
    await expect(promise).rejects.toBe(reason);
    expect(observedSignal?.aborted).toBe(true);
  });

  test('clears timeout after a successful fast request', async () => {
    const timeoutMs = 80;
    let observedSignal: AbortSignal | undefined;
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      timeoutMs,
      maxRetries: 0,
      fetch: async (input) => {
        const req = input instanceof Request ? input : new Request(input.toString());
        observedSignal = req.signal;
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    await client.models.ocr();
    expect(observedSignal?.aborted).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, timeoutMs + 40));
    expect(observedSignal?.aborted).toBe(false);
  });
});
