import { describe, expect, test } from 'bun:test';
import { OpenParserClient, OpenParserServiceUnavailableError } from '../src';
import { isRetriableStatus, isRetryableRequest } from '../src/lib/retry-policy';

describe('isRetryableRequest', () => {
  test('allows safe read methods', () => {
    expect(isRetryableRequest({ method: 'GET' })).toBe(true);
    expect(isRetryableRequest({ method: 'HEAD' })).toBe(true);
    expect(isRetryableRequest({ method: 'get' })).toBe(true);
  });

  test('allows mutations with a non-empty idempotency key', () => {
    expect(isRetryableRequest({ method: 'POST', idempotencyKey: 'idem-1' })).toBe(true);
  });

  test('rejects unsafe mutations without idempotency protection', () => {
    expect(isRetryableRequest({ method: 'POST' })).toBe(false);
    expect(isRetryableRequest({ method: 'PATCH' })).toBe(false);
    expect(isRetryableRequest({ method: 'DELETE' })).toBe(false);
    expect(isRetryableRequest({ method: 'PUT' })).toBe(false);
  });

  test('rejects blank idempotency keys', () => {
    expect(isRetryableRequest({ method: 'POST', idempotencyKey: '' })).toBe(false);
    expect(isRetryableRequest({ method: 'POST', idempotencyKey: '   ' })).toBe(false);
  });
});

describe('isRetriableStatus', () => {
  test('treats 429 and 5xx as retriable when the request itself is retryable', () => {
    expect(isRetriableStatus(429)).toBe(true);
    expect(isRetriableStatus(500)).toBe(true);
    expect(isRetriableStatus(503)).toBe(true);
    expect(isRetriableStatus(400)).toBe(false);
    expect(isRetriableStatus(409)).toBe(false);
  });
});

interface MockResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

function mockFetch(
  responses: MockResponse[],
  capturedRequests?: { method: string; url: string }[]
): typeof globalThis.fetch {
  let i = 0;
  return async (input: Request | string | URL): Promise<Response> => {
    const req = input instanceof Request ? input : new Request(input.toString());
    capturedRequests?.push({ method: req.method, url: req.url });
    const r = responses[i] ?? responses[responses.length - 1];
    if (i < responses.length - 1) i += 1;
    return new Response(r.body !== undefined ? JSON.stringify(r.body) : null, {
      status: r.status,
      headers: { 'content-type': 'application/json', ...(r.headers ?? {}) },
    });
  };
}

const serviceUnavailable503: MockResponse = {
  status: 503,
  body: {
    error: {
      code: 'service_unavailable',
      message: 'down',
      request_id: 'req_retry',
      retryable: true,
    },
  },
};

describe('OpenParserClient retry policy', () => {
  test('retries safe GET requests on 503', async () => {
    const captured: { method: string }[] = [];
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      fetch: mockFetch([serviceUnavailable503, { status: 200, body: { data: [] } }], captured),
      maxRetries: 2,
    });

    await client.models.ocr();
    expect(captured).toHaveLength(2);
    expect(captured.every((r) => r.method === 'GET')).toBe(true);
  });

  test('retries safe GET requests after transport errors', async () => {
    let calls = 0;
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      maxRetries: 2,
      fetch: async () => {
        calls += 1;
        if (calls === 1) throw new TypeError('Failed to fetch');
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    await client.models.ocr();
    expect(calls).toBe(2);
  });

  test('retries idempotency-keyed parse admission on 503', async () => {
    const captured: { headers?: Record<string, string> }[] = [];
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      fetch: mockFetch(
        [serviceUnavailable503, { status: 202, body: { id: 'opj_1', status: 'queued' } }],
        captured as unknown as { method: string; url: string }[]
      ),
      maxRetries: 1,
    });

    await client.parse.async(
      { ocr_model: 'paddleocr-vl-1.6' },
      new File([new Uint8Array([1])], 'doc.pdf', { type: 'application/pdf' }),
      { idempotencyKey: 'idem-parse' }
    );

    expect(captured).toHaveLength(2);
  });

  test('retries idempotency-keyed parse admission after transport errors', async () => {
    let calls = 0;
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      maxRetries: 1,
      fetch: async () => {
        calls += 1;
        if (calls === 1) throw new TypeError('Failed to fetch');
        return new Response(JSON.stringify({ id: 'opj_1', status: 'queued' }), {
          status: 202,
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    await client.parse.async(
      { ocr_model: 'paddleocr-vl-1.6' },
      new File([new Uint8Array([1])], 'doc.pdf', { type: 'application/pdf' }),
      { idempotencyKey: 'idem-parse-net' }
    );
    expect(calls).toBe(2);
  });

  test('does not retry unprotected file uploads on 503', async () => {
    const captured: { method: string }[] = [];
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      fetch: mockFetch([serviceUnavailable503, serviceUnavailable503], captured),
      maxRetries: 2,
    });

    await expect(
      client.files.upload(new File([new Uint8Array([1])], 'doc.pdf', { type: 'application/pdf' }))
    ).rejects.toBeInstanceOf(OpenParserServiceUnavailableError);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.method).toBe('POST');
  });

  test('does not retry unprotected file uploads after transport errors', async () => {
    let calls = 0;
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      maxRetries: 2,
      fetch: async () => {
        calls += 1;
        throw new TypeError('Failed to fetch');
      },
    });

    await expect(
      client.files.upload(new File([new Uint8Array([1])], 'doc.pdf', { type: 'application/pdf' }))
    ).rejects.toThrow('Failed to fetch');
    expect(calls).toBe(1);
  });

  test('does not retry pipeline mutations on 503', async () => {
    const captured: { method: string }[] = [];
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      fetch: mockFetch([serviceUnavailable503, serviceUnavailable503], captured),
      maxRetries: 2,
    });

    await expect(
      client.pipelines.create({
        name: 'demo',
        schema: { type: 'object', properties: {} },
      })
    ).rejects.toBeInstanceOf(OpenParserServiceUnavailableError);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.method).toBe('POST');
  });

  test('does not retry unprotected POST helpers such as suggestSchema', async () => {
    const captured: { method: string }[] = [];
    const client = new OpenParserClient({
      apiKey: 'eg_test',
      baseUrl: 'https://api.openparser.dev',
      fetch: mockFetch([serviceUnavailable503, serviceUnavailable503], captured),
      maxRetries: 2,
    });

    await expect(
      client.extract.suggestSchema({
        document_text: 'hello',
      })
    ).rejects.toBeInstanceOf(OpenParserServiceUnavailableError);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.method).toBe('POST');
  });
});
