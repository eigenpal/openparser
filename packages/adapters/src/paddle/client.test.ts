import { describe, expect, test } from 'bun:test';
import { PDFDocument } from 'pdf-lib';
import { createHttpHpsClient, HpsParseError } from './client';

function tinyPng(): Uint8Array {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );
}

describe('Paddle HPS HTTP client', () => {
  test('uses the raw Paddle health and layout endpoints', async () => {
    const requests: Array<{ url: string; method: string; body?: Record<string, unknown> }> = [];
    const client = createHttpHpsClient({
      baseUrl: 'http://paddle.internal:8080/',
      fetchImpl: async (url, init) => {
        requests.push({
          url,
          method: init?.method ?? 'GET',
          body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined,
        });
        if (url.endsWith('/health')) return Response.json({ errorCode: 0, errorMsg: 'Healthy' });
        return Response.json({
          errorCode: 0,
          errorMsg: 'Success',
          result: {
            layoutParsingResults: [
              {
                prunedResult: {
                  width: 1,
                  height: 1,
                  parsing_res_list: [],
                },
              },
            ],
          },
        });
      },
    });

    expect(await client.healthOk()).toBe(true);
    await client.parse({
      content: tinyPng(),
      mediaType: 'image/png',
      documentId: 'doc-test',
      nativeOptions: {
        useChartRecognition: false,
        useOcrForImageBlock: false,
        returnMarkdownImages: false,
        mergeLayoutBlocks: false,
      },
    });

    expect(requests[0]).toMatchObject({
      url: 'http://paddle.internal:8080/health',
      method: 'GET',
    });
    expect(requests[1]).toMatchObject({
      url: 'http://paddle.internal:8080/layout-parsing',
      method: 'POST',
      body: {
        file: Buffer.from(tinyPng()).toString('base64'),
        fileType: 1,
        formatBlockContent: true,
        useChartRecognition: false,
        useOcrForImageBlock: false,
        returnMarkdownImages: false,
        mergeLayoutBlocks: false,
        visualize: false,
      },
    });
  });

  test('chunks large PDFs without imposing a document page limit', async () => {
    const source = await PDFDocument.create();
    source.addPage([612, 792]);
    source.addPage([612, 792]);
    source.addPage([612, 792]);
    const requestPageCounts: number[] = [];
    const client = createHttpHpsClient({
      baseUrl: 'http://paddle.internal:8080',
      pdfChunkPages: 2,
      fetchImpl: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { file: string; fileType: number };
        expect(body.fileType).toBe(0);
        const chunk = await PDFDocument.load(Buffer.from(body.file, 'base64'));
        const pageCount = chunk.getPageCount();
        requestPageCounts.push(pageCount);
        return Response.json({
          errorCode: 0,
          result: {
            layoutParsingResults: Array.from({ length: pageCount }, () => ({
              prunedResult: {
                width: 1224,
                height: 1584,
                parsing_res_list: [],
              },
            })),
          },
        });
      },
    });

    const output = await client.parse({
      content: await source.save(),
      mediaType: 'application/pdf',
      documentId: 'pdf-test',
    });

    expect(requestPageCounts).toEqual([2, 1]);
    expect('canonical' in output && output.canonical.pages).toHaveLength(3);
  });

  test('rejects unsuccessful Paddle response envelopes', async () => {
    const client = createHttpHpsClient({
      baseUrl: 'http://paddle.internal:8080',
      fetchImpl: async () =>
        Response.json({ errorCode: 422, errorMsg: 'Invalid input file', result: null }),
    });

    await expect(
      client.parse({
        content: tinyPng(),
        mediaType: 'image/png',
        documentId: 'bad-input',
      })
    ).rejects.toBeInstanceOf(HpsParseError);
  });
});
