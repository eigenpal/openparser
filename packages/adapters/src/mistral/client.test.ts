import { describe, expect, test } from 'bun:test';
import { PDFDocument } from 'pdf-lib';
import { tinyPngBytes } from '../test-fixtures/bytes';
import { MistralOcrError, createHttpMistralOcrClient } from './index';

const MISTRAL_FIXTURE = {
  model: 'mistral-ocr-4-0',
  pages: [
    {
      index: 0,
      markdown: '# Report\n\n[tbl-0.html](tbl-0.html)',
      dimensions: { width: 1000, height: 1200 },
      blocks: [
        {
          type: 'table',
          content: '<table><tr><th>Revenue</th></tr><tr><td>42</td></tr></table>',
          top_left_x: 100,
          top_left_y: 200,
          bottom_right_x: 900,
          bottom_right_y: 1000,
        },
      ],
      tables: [
        {
          id: 'tbl-0.html',
          format: 'html',
          content: '<table><tr><th>Revenue</th></tr><tr><td>42</td></tr></table>',
        },
      ],
    },
  ],
  usage_info: { pages_processed: 1 },
};

async function tinyPdfBytes(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage([72, 72]);
  return new Uint8Array(await pdf.save());
}

describe('createHttpMistralOcrClient', () => {
  test('posts /v1/ocr with provider-native model and explicit options', async () => {
    let requestUrl = '';
    let requestBody: Record<string, unknown> | undefined;
    const client = createHttpMistralOcrClient({
      apiKey: 'test-key',
      baseUrl: 'https://mistral.test',
      fetchImpl: async (url, init) => {
        requestUrl = String(url);
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return Response.json(MISTRAL_FIXTURE);
      },
    });

    const output = await client.parse({
      bytes: tinyPngBytes(),
      mediaType: 'image/png',
      documentId: 'doc-1',
      model: 'mistral-ocr-4-0',
      options: { table_format: 'html', include_blocks: true },
    });

    expect(requestUrl).toBe('https://mistral.test/v1/ocr');
    expect(requestBody).toMatchObject({
      model: 'mistral-ocr-4-0',
      table_format: 'html',
      include_blocks: true,
    });
    const document = requestBody?.document as Record<string, string>;
    expect(document.type).toBe('image_url');
    expect(document.image_url).toStartWith('data:image/png;base64,');
    expect(output.nativeResult).toEqual(MISTRAL_FIXTURE);
    expect(output.canonical.document_id).toBe('doc-1');
    expect(output.canonical.markdown).toContain('<table>');
  });

  test('uses document_url data URL for PDF uploads', async () => {
    let requestBody: Record<string, unknown> | undefined;
    const client = createHttpMistralOcrClient({
      apiKey: 'test-key',
      fetchImpl: async (_url, init) => {
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return Response.json({
          model: 'mistral-ocr-4-0',
          pages: [{ markdown: 'page one' }, { markdown: 'page two' }],
        });
      },
    });

    const pdfBytes = await tinyPdfBytes();
    const pdf = await PDFDocument.load(pdfBytes);
    const second = pdf.addPage([72, 72]);
    second.drawText('two');
    const twoPagePdf = new Uint8Array(await pdf.save());

    await client.parse({
      bytes: twoPagePdf,
      mediaType: 'application/pdf',
      documentId: 'doc-pdf',
      model: 'mistral-ocr-4-0',
    });

    const document = requestBody?.document as Record<string, string>;
    expect(document.type).toBe('document_url');
    expect(document.document_url).toStartWith('data:application/pdf;base64,');
  });

  test('classifies HTTP 429 as retryable', async () => {
    const client = createHttpMistralOcrClient({
      apiKey: 'test-key',
      fetchImpl: async () => new Response('rate limited', { status: 429 }),
    });

    await expect(
      client.parse({
        bytes: tinyPngBytes(),
        mediaType: 'image/png',
        documentId: 'doc-1',
        model: 'mistral-ocr-4-0',
      })
    ).rejects.toMatchObject({
      name: 'MistralOcrError',
      retryable: true,
      dispatchAmbiguous: false,
    } satisfies Partial<MistralOcrError>);
  });

  test('classifies HTTP 500 as retryable and HTTP 400 as non-retryable', async () => {
    const retryable = createHttpMistralOcrClient({
      apiKey: 'test-key',
      fetchImpl: async () => new Response('server error', { status: 500 }),
    });
    await expect(
      retryable.parse({
        bytes: tinyPngBytes(),
        mediaType: 'image/png',
        documentId: 'doc-1',
        model: 'mistral-ocr-4-0',
      })
    ).rejects.toMatchObject({ retryable: true, dispatchAmbiguous: true });

    const nonRetryable = createHttpMistralOcrClient({
      apiKey: 'test-key',
      fetchImpl: async () => Response.json({ message: 'bad request' }, { status: 400 }),
    });
    await expect(
      nonRetryable.parse({
        bytes: tinyPngBytes(),
        mediaType: 'image/png',
        documentId: 'doc-1',
        model: 'mistral-ocr-4-0',
      })
    ).rejects.toMatchObject({ retryable: false });
  });
});
