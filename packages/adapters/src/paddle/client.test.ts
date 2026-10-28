import { describe, expect, test } from 'bun:test';
import { PDFDocument } from 'pdf-lib';
import {
  countLayoutRegions,
  createHttpHpsClient,
  HpsParseError,
  HpsRequestTimeoutError,
  type HpsRequestStats,
} from './client';

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

    const stats: HpsRequestStats[] = [];
    const output = await client.parse({
      content: await source.save(),
      mediaType: 'application/pdf',
      documentId: 'pdf-test',
      onRequestComplete: (request) => stats.push(request),
    });

    expect(requestPageCounts).toEqual([2, 1]);
    expect('canonical' in output && output.canonical.pages).toHaveLength(3);
    // One stats record per physical request, with the page range it covered.
    expect(stats.map(({ range, pages, regions }) => ({ range, pages, regions }))).toEqual([
      { range: { startPage: 0, endPage: 2 }, pages: 2, regions: 0 },
      { range: { startPage: 2, endPage: 3 }, pages: 1, regions: 0 },
    ]);
    for (const request of stats) {
      expect(request.requestBytes).toBeGreaterThan(0);
      expect(request.requestMs).toBeGreaterThanOrEqual(0);
      expect(request.prepareMs).toBeGreaterThanOrEqual(0);
    }
  });

  test('bisects a chunk the gateway stopped at its own deadline, but not a bare 504', async () => {
    const source = await PDFDocument.create();
    source.addPage([612, 792]);
    source.addPage([612, 792]);
    const content = await source.save();
    const run = async (deadlineHeader: boolean) => {
      const requestPageCounts: number[] = [];
      const client = createHttpHpsClient({
        baseUrl: 'http://glm.internal:8080',
        pdfChunkPages: 2,
        fetchImpl: async (_url, init) => {
          const body = JSON.parse(String(init?.body)) as { file: string };
          const pageCount = (
            await PDFDocument.load(Buffer.from(body.file, 'base64'))
          ).getPageCount();
          requestPageCounts.push(pageCount);
          if (pageCount > 1) {
            return Response.json(
              { errorCode: 504, errorMsg: 'GLM parse stopped: deadline' },
              {
                status: 504,
                headers: deadlineHeader ? { 'X-OpenParser-Deadline-Exceeded': '1' } : {},
              }
            );
          }
          return Response.json({
            errorCode: 0,
            result: {
              layoutParsingResults: [
                { prunedResult: { width: 1224, height: 1584, parsing_res_list: [] } },
              ],
            },
          });
        },
      });
      const output = await client
        .parse({ content, mediaType: 'application/pdf', documentId: 'pdf-deadline' })
        .catch((error: unknown) => error);
      return { output, requestPageCounts };
    };

    const marked = await run(true);
    expect(marked.requestPageCounts).toEqual([2, 1, 1]);
    expect(marked.output).not.toBeInstanceOf(Error);

    const bare = await run(false);
    expect(bare.requestPageCounts).toEqual([2]);
    expect(bare.output).toBeInstanceOf(HpsRequestTimeoutError);
  });

  async function pdfWithPages(count: number): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    // Page width encodes the source page, so a chunk reveals where it starts.
    for (let page = 0; page < count; page++) pdf.addPage([600 + page, 792]);
    return pdf.save();
  }

  // Identifies each chunk by its first source page (from the page width).
  function chunkResponder(options: {
    delayFor: (firstPage: number) => number;
    failFirstPage?: number;
    calls: { pages: number; firstPage: number }[];
    inFlight: { now: number; max: number };
  }) {
    return async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { file: string };
      const chunk = await PDFDocument.load(Buffer.from(body.file, 'base64'));
      const pages = chunk.getPageCount();
      const firstPage = Math.round(chunk.getPage(0).getWidth()) - 600;
      options.calls.push({ pages, firstPage });
      options.inFlight.now += 1;
      options.inFlight.max = Math.max(options.inFlight.max, options.inFlight.now);
      try {
        await Bun.sleep(options.delayFor(firstPage));
        if (firstPage === options.failFirstPage) {
          return Response.json({ errorCode: 500, errorMsg: 'boom' }, { status: 400 });
        }
        return Response.json({
          errorCode: 0,
          result: {
            layoutParsingResults: Array.from({ length: pages }, () => ({
              prunedResult: { width: 600, height: 792, parsing_res_list: [] },
            })),
          },
        });
      } finally {
        options.inFlight.now -= 1;
      }
    };
  }

  test('runs PDF chunks on two lanes when a slot is free, keeping page order', async () => {
    const calls: { pages: number; firstPage: number }[] = [];
    const inFlight = { now: 0, max: 0 };
    const client = createHttpHpsClient({
      baseUrl: 'http://paddle.internal:8080',
      pdfChunkPages: 2,
      pdfChunkConcurrency: 2,
      // The first chunk is slowest, so later chunks finish before it.
      fetchImpl: chunkResponder({
        delayFor: (firstPage) => (firstPage === 0 ? 60 : 5),
        calls,
        inFlight,
      }),
    });
    let leases = 0;
    let finished = 0;
    const stats: HpsRequestStats[] = [];
    const output = await client.parse({
      content: await pdfWithPages(6),
      mediaType: 'application/pdf',
      documentId: 'pdf-lanes',
      tryBorrowRequestSlot: () => {
        leases += 1;
        return { finish: () => void (finished += 1) };
      },
      onRequestComplete: (request) => stats.push(request),
    });

    expect(inFlight.max).toBe(2);
    expect(calls).toHaveLength(3);
    expect(leases).toBeGreaterThan(0);
    expect(finished).toBe(leases);
    expect('canonical' in output && output.canonical.pages.map((page) => page.number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(stats.map((request) => request.range?.startPage).sort()).toEqual([0, 2, 4]);
  });

  test('stays on one lane when no extra GPU slot is free', async () => {
    const calls: { pages: number; firstPage: number }[] = [];
    const inFlight = { now: 0, max: 0 };
    const client = createHttpHpsClient({
      baseUrl: 'http://paddle.internal:8080',
      pdfChunkPages: 2,
      pdfChunkConcurrency: 2,
      fetchImpl: chunkResponder({ delayFor: () => 5, calls, inFlight }),
    });
    const output = await client.parse({
      content: await pdfWithPages(4),
      mediaType: 'application/pdf',
      documentId: 'pdf-no-borrow',
      tryBorrowRequestSlot: () => null,
    });

    expect(inFlight.max).toBe(1);
    expect(calls.map((call) => call.pages)).toEqual([2, 2]);
    expect('canonical' in output && output.canonical.pages).toHaveLength(4);
  });

  test('a chunk the extra lane cannot get a slot for goes back to lane 0, never stranded', async () => {
    const calls: { pages: number; firstPage: number }[] = [];
    const inFlight = { now: 0, max: 0 };
    const client = createHttpHpsClient({
      baseUrl: 'http://paddle.internal:8080',
      pdfChunkPages: 2,
      pdfChunkConcurrency: 2,
      fetchImpl: chunkResponder({ delayFor: () => 5, calls, inFlight }),
    });
    // The extra lane takes chunk 2-4 and is still reading its checkpoint when
    // lane 0 finishes chunk 0-2; then it is refused a slot.
    const parse = client.parse({
      content: await pdfWithPages(4),
      mediaType: 'application/pdf',
      documentId: 'pdf-stranded',
      tryBorrowRequestSlot: () => null,
      loadPdfChunk: async (range) => {
        if (range.startPage === 2) await Bun.sleep(30);
        return null;
      },
    });
    const outcome = await Promise.race([
      parse.then(() => 'done' as const),
      Bun.sleep(2_000).then(() => 'hung' as const),
    ]);

    expect(outcome).toBe('done');
    expect(calls.map((call) => call.firstPage).sort()).toEqual([0, 2]);
  });

  test('a failed chunk lets its sibling finish and save, starts nothing new, and raises', async () => {
    const calls: { pages: number; firstPage: number }[] = [];
    const inFlight = { now: 0, max: 0 };
    const saved: string[] = [];
    const client = createHttpHpsClient({
      baseUrl: 'http://paddle.internal:8080',
      pdfChunkPages: 2,
      pdfChunkConcurrency: 2,
      // Chunk 0 fails fast; chunk 2-4 (the sibling) is still running when it does.
      fetchImpl: chunkResponder({
        delayFor: (firstPage) => (firstPage === 2 ? 40 : 5),
        failFirstPage: 0,
        calls,
        inFlight,
      }),
    });
    let finished = 0;

    await expect(
      client.parse({
        content: await pdfWithPages(8),
        mediaType: 'application/pdf',
        documentId: 'pdf-fail',
        tryBorrowRequestSlot: () => ({ finish: () => void (finished += 1) }),
        savePdfChunk: async (range, state) => {
          if (state.status === 'completed') saved.push(`${range.startPage}-${range.endPage}`);
        },
      })
    ).rejects.toThrow();

    expect(calls).toHaveLength(2);
    expect(saved).toEqual(['2-4']);
    expect(finished).toBe(1);
  });

  test('counts layout regions across pages and tolerates malformed pages', () => {
    expect(
      countLayoutRegions([
        { prunedResult: { parsing_res_list: [{}, {}, {}] } },
        { prunedResult: { parsing_res_list: [{}] } },
        { prunedResult: {} },
        null,
      ])
    ).toBe(4);
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
