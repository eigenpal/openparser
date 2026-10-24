import { describe, expect, test } from 'bun:test';
import { PDFDocument } from 'pdf-lib';
import { tinyPngBytes } from '../test-fixtures/bytes';
import { AZURE_DI_API_VERSION, AzureDiError, createHttpAzureDiClient } from './index';

function okSubmitResponse(resultId = 'result-1') {
  return new Response(null, {
    status: 202,
    headers: {
      'operation-location': `https://azure.test/documentintelligence/documentModels/prebuilt-layout/analyzeResults/${resultId}?api-version=${AZURE_DI_API_VERSION}`,
    },
  });
}

function throttledSubmit() {
  return new Response(JSON.stringify({ error: { message: 'Rate limit exceeded' } }), {
    status: 429,
    headers: { 'retry-after': '0' },
  });
}

function runningPoll(updated: string) {
  return Response.json({
    status: 'running',
    createdDateTime: '2026-06-25T15:00:00Z',
    lastUpdatedDateTime: updated,
  });
}

function succeededPoll(updated: string, analyzeResult: Record<string, unknown>) {
  return Response.json({
    status: 'succeeded',
    createdDateTime: '2026-06-25T15:00:00Z',
    lastUpdatedDateTime: updated,
    analyzeResult,
  });
}

const LAYOUT_ANALYZE_RESULT = {
  pages: [
    {
      pageNumber: 1,
      width: 1000,
      height: 1000,
      lines: [{ content: 'hello', polygon: [100, 100, 500, 100, 500, 150, 100, 150] }],
    },
  ],
  paragraphs: [
    {
      content: 'hello',
      boundingRegions: [
        {
          pageNumber: 1,
          polygon: [
            { x: 100, y: 100 },
            { x: 500, y: 100 },
            { x: 500, y: 150 },
            { x: 100, y: 150 },
          ],
        },
      ],
    },
  ],
};

describe('createHttpAzureDiClient', () => {
  test('submits analyze, polls operation-location, and maps layout markdown model', async () => {
    const calls: Array<{ url: string; method: string }> = [];
    let pollCount = 0;
    const client = createHttpAzureDiClient({
      endpoint: 'https://azure.test',
      apiKey: 'test-key',
      pollIntervalMs: 1,
      pollTimeoutMs: 5_000,
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), method: init?.method ?? 'GET' });
        if (init?.method === 'POST') {
          return okSubmitResponse();
        }
        pollCount += 1;
        if (pollCount < 3) {
          return runningPoll(`2026-06-25T15:00:0${pollCount}Z`);
        }
        return succeededPoll('2026-06-25T15:00:04Z', LAYOUT_ANALYZE_RESULT);
      },
    });

    const output = await client.parse({
      bytes: tinyPngBytes(),
      mediaType: 'image/png',
      documentId: 'doc-1',
      modelId: 'prebuilt-layout',
      outputContentFormat: 'markdown',
    });

    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.url).toContain('/documentModels/prebuilt-layout:analyze');
    expect(calls[0]?.url).toContain(`api-version=${AZURE_DI_API_VERSION}`);
    expect(calls[0]?.url).toContain('outputContentFormat=markdown');
    expect(calls[0]?.url).toContain('stringIndexType=utf16CodeUnit');
    expect(calls.at(-1)?.url).toContain('/analyzeResults/result-1');
    expect(output.nativeResult.status).toBe('succeeded');
    expect(output.canonical.document_id).toBe('doc-1');
    expect(output.canonical.markdown).toBe('hello');
    expect('text_index_unit' in output.canonical).toBe(false);
  });

  test('retries submit when Azure returns 429', async () => {
    let postCalls = 0;
    const client = createHttpAzureDiClient({
      endpoint: 'https://azure.test',
      apiKey: 'test-key',
      pollIntervalMs: 1,
      pollTimeoutMs: 5_000,
      fetchImpl: async (_url, init) => {
        if (init?.method === 'POST') {
          postCalls += 1;
          return postCalls === 1 ? throttledSubmit() : okSubmitResponse();
        }
        return succeededPoll('2026-06-25T15:00:04Z', LAYOUT_ANALYZE_RESULT);
      },
    });

    const output = await client.parse({
      bytes: tinyPngBytes(),
      mediaType: 'image/png',
      documentId: 'doc-1',
      modelId: 'prebuilt-layout',
      outputContentFormat: 'markdown',
    });

    expect(postCalls).toBe(2);
    expect(output.canonical.markdown).toBe('hello');
  });

  test('fails when polling stops making progress', async () => {
    const client = createHttpAzureDiClient({
      endpoint: 'https://azure.test',
      apiKey: 'test-key',
      pollIntervalMs: 1,
      pollTimeoutMs: 5,
      fetchImpl: async (_url, init) => {
        if (init?.method === 'POST') return okSubmitResponse();
        return runningPoll('2026-06-25T15:00:01Z');
      },
    });

    await expect(
      client.parse({
        bytes: tinyPngBytes(),
        mediaType: 'image/png',
        documentId: 'doc-1',
        modelId: 'prebuilt-layout',
        outputContentFormat: 'markdown',
      })
    ).rejects.toThrow('stalled after 5ms without progress');
  });

  test('classifies HTTP 503 poll responses as retryable until success', async () => {
    let pollCalls = 0;
    const client = createHttpAzureDiClient({
      endpoint: 'https://azure.test',
      apiKey: 'test-key',
      pollIntervalMs: 1,
      pollTimeoutMs: 5_000,
      fetchImpl: async (_url, init) => {
        if (init?.method === 'POST') return okSubmitResponse();
        pollCalls += 1;
        if (pollCalls === 1) {
          return new Response('unavailable', { status: 503 });
        }
        return succeededPoll('2026-06-25T15:00:04Z', LAYOUT_ANALYZE_RESULT);
      },
    });

    const output = await client.parse({
      bytes: tinyPngBytes(),
      mediaType: 'image/png',
      documentId: 'doc-1',
      modelId: 'prebuilt-layout',
      outputContentFormat: 'markdown',
    });

    expect(pollCalls).toBe(2);
    expect(output.canonical.markdown).toBe('hello');
  });

  test('coordinateScale maps page size and polygons back to the original image', async () => {
    const client = createHttpAzureDiClient({
      endpoint: 'https://azure.test',
      apiKey: 'test-key',
      pollIntervalMs: 1,
      fetchImpl: async (_url, init) => {
        if (init?.method === 'POST') return okSubmitResponse();
        return succeededPoll('2026-06-25T15:00:04Z', structuredClone(LAYOUT_ANALYZE_RESULT));
      },
    });

    const output = await client.parse({
      bytes: tinyPngBytes(),
      mediaType: 'image/png',
      documentId: 'doc-1',
      modelId: 'prebuilt-layout',
      outputContentFormat: 'markdown',
      coordinateScale: { x: 2, y: 1.5 },
    });

    const result = (output.nativeResult as { analyzeResult: typeof LAYOUT_ANALYZE_RESULT })
      .analyzeResult;
    expect(result.pages[0]).toMatchObject({
      width: 2000,
      height: 1500,
      lines: [{ polygon: [200, 150, 1000, 150, 1000, 225, 200, 225] }],
    });
    expect(result.paragraphs[0]!.boundingRegions[0]!.polygon[0]).toEqual({ x: 200, y: 150 });
    expect(output.canonical.pages[0]).toMatchObject({ width: 2000, height: 1500 });
  });

  test('keeps the Azure inner error code when Azure rejects the document', async () => {
    const client = createHttpAzureDiClient({
      endpoint: 'https://azure.test',
      apiKey: 'test-key',
      pollIntervalMs: 1,
      fetchImpl: async () =>
        Response.json(
          {
            error: {
              code: 'InvalidRequest',
              message: 'Invalid request.',
              innererror: {
                code: 'InvalidContentDimensions',
                message: 'The input image dimensions are out of range.',
              },
            },
          },
          { status: 400 }
        ),
    });

    const error = await client
      .parse({
        bytes: tinyPngBytes(),
        mediaType: 'image/png',
        documentId: 'doc-1',
        modelId: 'prebuilt-read',
        outputContentFormat: 'text',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AzureDiError);
    expect(error).toMatchObject({
      status: 400,
      providerCode: 'InvalidContentDimensions',
      inputRejected: true,
      retryable: false,
      message:
        'Azure Document Intelligence submit failed HTTP 400: Invalid request.: The input image dimensions are out of range.',
    });
  });

  test('does not blame the document for a 400 about request parameters', async () => {
    const client = createHttpAzureDiClient({
      endpoint: 'https://azure.test',
      apiKey: 'test-key',
      pollIntervalMs: 1,
      fetchImpl: async () =>
        Response.json(
          {
            error: {
              code: 'InvalidRequest',
              message: 'Invalid request.',
              innererror: { code: 'InvalidParameter', message: 'The parameter locale is invalid.' },
            },
          },
          { status: 400 }
        ),
    });

    const error = await client
      .parse({
        bytes: tinyPngBytes(),
        mediaType: 'image/png',
        documentId: 'doc-1',
        modelId: 'prebuilt-read',
        outputContentFormat: 'text',
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      status: 400,
      providerCode: 'InvalidParameter',
      inputRejected: false,
    });
  });

  test('marks a failed analysis with a content error code as rejected input', async () => {
    const client = createHttpAzureDiClient({
      endpoint: 'https://azure.test',
      apiKey: 'test-key',
      pollIntervalMs: 1,
      fetchImpl: async (_url, init) => {
        if (init?.method === 'POST') return okSubmitResponse();
        return Response.json({
          status: 'failed',
          lastUpdatedDateTime: '2026-06-25T15:00:04Z',
          error: {
            code: 'InvalidRequest',
            message: 'Invalid request.',
            innererror: { code: 'InvalidContent', message: 'The file is corrupted.' },
          },
        });
      },
    });

    const error = await client
      .parse({
        bytes: tinyPngBytes(),
        mediaType: 'image/png',
        documentId: 'doc-1',
        modelId: 'prebuilt-read',
        outputContentFormat: 'text',
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ providerCode: 'InvalidContent', inputRejected: true });
  });

  test('derives expected page count from PDF bytes', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([72, 72]);
    pdf.addPage([72, 72]);
    const bytes = new Uint8Array(await pdf.save());

    const client = createHttpAzureDiClient({
      endpoint: 'https://azure.test',
      apiKey: 'test-key',
      pollIntervalMs: 1,
      fetchImpl: async (_url, init) => {
        if (init?.method === 'POST') return okSubmitResponse();
        return succeededPoll('2026-06-25T15:00:04Z', {
          pages: [
            {
              pageNumber: 1,
              width: 1000,
              height: 1000,
              lines: [{ content: 'one', polygon: [100, 100, 500, 100, 500, 150, 100, 150] }],
            },
            {
              pageNumber: 2,
              width: 1000,
              height: 1000,
              lines: [{ content: 'two', polygon: [100, 100, 500, 100, 500, 150, 100, 150] }],
            },
          ],
        });
      },
    });

    const output = await client.parse({
      bytes,
      mediaType: 'application/pdf',
      documentId: 'doc-pdf',
      modelId: 'prebuilt-layout',
      outputContentFormat: 'markdown',
    });

    expect(output.canonical.pages).toHaveLength(2);
    expect(output.canonical.markdown).toContain('one');
    expect(output.canonical.markdown).toContain('two');
  });

  test('maps non-retryable analysis failure', async () => {
    const client = createHttpAzureDiClient({
      endpoint: 'https://azure.test',
      apiKey: 'test-key',
      pollIntervalMs: 1,
      fetchImpl: async (_url, init) => {
        if (init?.method === 'POST') return okSubmitResponse();
        return Response.json({
          status: 'failed',
          error: { message: 'corrupt document' },
        });
      },
    });

    await expect(
      client.parse({
        bytes: tinyPngBytes(),
        mediaType: 'image/png',
        documentId: 'doc-1',
        modelId: 'prebuilt-layout',
        outputContentFormat: 'markdown',
      })
    ).rejects.toMatchObject({
      name: 'AzureDiError',
      retryable: false,
      message: expect.stringContaining('failed'),
    } satisfies Partial<AzureDiError>);
  });
});
