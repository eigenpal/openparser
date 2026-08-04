import { describe, expect, test } from 'bun:test';

import { GoogleDocumentAiError, createGoogleDocumentAiClient } from './index';

const TEST_PROCESSOR_VERSION = 'pretrained-ocr-v2.1-2024-08-07';

const FIXTURE_DOCUMENT = {
  text: 'Quarterly report\nRevenue 42\n',
  pages: [
    {
      dimension: { width: 1000, height: 1000 },
      lines: [
        {
          layout: {
            textAnchor: { textSegments: [{ endIndex: '17' }] },
            confidence: 0.99,
            boundingPoly: {
              normalizedVertices: [
                { x: 0.1, y: 0.1 },
                { x: 0.5, y: 0.1 },
                { x: 0.5, y: 0.15 },
                { x: 0.1, y: 0.15 },
              ],
            },
          },
        },
        {
          layout: {
            textAnchor: {
              textSegments: [{ startIndex: '17', endIndex: '28' }],
            },
            confidence: 0.98,
            boundingPoly: {
              normalizedVertices: [
                { x: 0.1, y: 0.2 },
                { x: 0.5, y: 0.2 },
                { x: 0.5, y: 0.25 },
                { x: 0.1, y: 0.25 },
              ],
            },
          },
        },
      ],
    },
  ],
};

describe('createGoogleDocumentAiClient', () => {
  test('ProcessDocument passes processor version, options, ADC headers, and maps output', async () => {
    let seenUrl = '';
    let seenHeaders: Record<string, string> = {};
    let seenBody: Record<string, unknown> | null = null;

    const client = createGoogleDocumentAiClient({
      projectId: 'eigenpal-ocr',
      location: 'eu',
      processorId: 'proc-ocr',
      processorVersionId: TEST_PROCESSOR_VERSION,
      auth: {
        async getRequestHeaders() {
          return { Authorization: 'Bearer test-token' };
        },
      },
      fetchImpl: async (url, init) => {
        seenUrl = String(url);
        seenHeaders = Object.fromEntries(
          Object.entries((init?.headers ?? {}) as Record<string, string>)
        );
        seenBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return Response.json({ document: FIXTURE_DOCUMENT });
      },
    });

    const bytes = new TextEncoder().encode('%PDF-1.4 fixture');
    const output = await client.parse({
      bytes: bytes,
      mediaType: 'application/pdf',
      documentId: 'doc-google-1',
      jobId: 'opj_aaaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa',
      options: {
        native_pdf_parsing: true,
        image_quality_scores: true,
        symbols: false,
        language_hints: ['en', 'sk'],
        math_ocr: true,
        selection_marks: false,
        style_info: true,
      },
    });

    expect(seenUrl).toContain(`/processorVersions/${TEST_PROCESSOR_VERSION}:process`);
    expect(seenUrl).toContain('projects/eigenpal-ocr/locations/eu/processors/proc-ocr');
    expect(seenHeaders.Authorization).toBe('Bearer test-token');
    expect(seenHeaders['x-goog-user-project']).toBe('eigenpal-ocr');
    expect(seenHeaders['Content-Type']).toBe('application/json');

    const rawDocument = seenBody?.rawDocument as { content?: string; mimeType?: string };
    expect(rawDocument?.mimeType).toBe('application/pdf');
    expect(rawDocument?.content).toBe(Buffer.from(bytes).toString('base64'));
    expect(seenBody?.imagelessMode).toBeUndefined();
    expect(seenBody?.processOptions).toEqual({
      ocrConfig: {
        enableNativePdfParsing: true,
        enableImageQualityScores: true,
        enableSymbol: false,
        hints: { languageHints: ['en', 'sk'] },
        premiumFeatures: {
          enableMathOcr: true,
          enableSelectionMarkDetection: false,
          computeStyleInfo: true,
        },
      },
    });

    expect(output.nativeResult.processor_version_id).toBe(TEST_PROCESSOR_VERSION);
    expect(output.nativeResult.processor_type).toBe('OCR_PROCESSOR');
    expect(output.nativeResult.page_count).toBe(1);
    expect(output.nativeResult.document).toEqual(FIXTURE_DOCUMENT);

    expect(output.canonical.output_format).toBe('openparser@1');
    expect(output.canonical.document_id).toBe('doc-google-1');
    expect(output.canonical.pages).toHaveLength(1);
    expect(output.canonical.markdown).toContain('Quarterly report');
    expect(output.canonical.elements.length).toBeGreaterThan(0);
  });

  test('omits imagelessMode by default and sends it only when explicitly set', async () => {
    let seenBodyDefault: Record<string, unknown> | null = null;
    let seenBodyImageless: Record<string, unknown> | null = null;
    const client = createGoogleDocumentAiClient({
      projectId: 'eigenpal-ocr',
      location: 'eu',
      processorId: 'proc-ocr',
      processorVersionId: TEST_PROCESSOR_VERSION,
      auth: {
        async getRequestHeaders() {
          return { Authorization: 'Bearer test-token' };
        },
      },
      fetchImpl: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        if (seenBodyDefault === null) {
          seenBodyDefault = body;
        } else {
          seenBodyImageless = body;
        }
        return Response.json({ document: FIXTURE_DOCUMENT });
      },
    });

    await client.parse({
      bytes: new Uint8Array([1, 2, 3]),
      mediaType: 'application/pdf',
      documentId: 'doc-default',
    });
    await client.parse({
      bytes: new Uint8Array([1, 2, 3]),
      mediaType: 'application/pdf',
      documentId: 'doc-imageless',
      imagelessMode: true,
    });

    expect(seenBodyDefault?.imagelessMode).toBeUndefined();
    expect(seenBodyDefault?.processOptions).toBeUndefined();
    expect(seenBodyImageless?.imagelessMode).toBe(true);
    expect(seenBodyImageless?.processOptions).toBeUndefined();
  });

  test('classifies 429 as retryable without leaking bearer tokens from error bodies', async () => {
    const client = createGoogleDocumentAiClient({
      projectId: 'eigenpal-ocr',
      location: 'eu',
      processorId: 'proc-ocr',
      processorVersionId: TEST_PROCESSOR_VERSION,
      auth: {
        async getRequestHeaders() {
          return { Authorization: 'Bearer secret-access-token-value' };
        },
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 429,
              status: 'RESOURCE_EXHAUSTED',
              message: 'Quota exceeded Authorization: Bearer sk-leaked-should-not-appear',
            },
          }),
          { status: 429 }
        ),
    });

    try {
      await client.parse({
        bytes: new Uint8Array([1, 2, 3]),
        mediaType: 'image/png',
        documentId: 'doc-429',
      });
      throw new Error('expected GoogleDocumentAiError');
    } catch (error) {
      expect(error).toBeInstanceOf(GoogleDocumentAiError);
      const googleError = error as InstanceType<typeof GoogleDocumentAiError>;
      expect(googleError.retryable).toBe(true);
      expect(googleError.dispatchAmbiguous).toBe(false);
      expect(googleError.httpStatus).toBe(429);
      expect(googleError.providerCode).toBe('RESOURCE_EXHAUSTED');
      expect(googleError.message).not.toContain('sk-leaked');
      expect(googleError.message).toContain('[redacted]');
    }
  });
});
