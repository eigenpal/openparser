import { ParsedDocumentSchema, type ParsedDocument } from '@openparser/schema';
import { PDFDocument } from 'pdf-lib';
import {
  mapLayoutResultsToParsedDocument as mapLayoutResultsToParsedDocumentPure,
  readDataInfoPages,
  type MapLayoutResultsInput,
  type PageDims,
} from './convert';
import { PaddleAdapterError } from './errors';
import { LOCKED_HPS_NATIVE_OPTIONS, type HpsNativeOptions } from './options';

export type HpsParseInput = {
  content: Uint8Array;
  mediaType: string;
  documentId: string;
  /** Model identifier retained in canonical provenance. */
  model?: string;
  nativeOptions?: Partial<HpsNativeOptions>;
  /** Optional lease-loss abort; cancelled when the worker loses its claim. */
  signal?: AbortSignal;
  /** Internal worker scheduling hooks around every physical HPS request. */
  beforeRequest?: () => Promise<void>;
  afterRequest?: (error: unknown | null) => Promise<void>;
  /** Durable chunk hooks; split markers prevent replaying known-slow parent ranges. */
  loadPdfChunk?: (range: HpsPdfChunkRange) => Promise<HpsPdfChunkState | null>;
  savePdfChunk?: (range: HpsPdfChunkRange, state: HpsPdfChunkState) => Promise<boolean | void>;
  onPdfChunkComplete?: (range: HpsPdfChunkRange, totalPages: number) => Promise<void>;
  loadPdfPageTimeoutCount?: (range: HpsPdfChunkRange) => Promise<number>;
  recordPdfPageTimeout?: (range: HpsPdfChunkRange, attempt: number) => Promise<void>;
  /** Timing and size of each successful physical HPS request, for metrics. */
  onRequestComplete?: (stats: HpsRequestStats) => void;
  /**
   * Extra PDF chunk lanes (pdfChunkConcurrency > 1): return a lease on a GPU
   * slot that is free right now, or null. Called once per physical request
   * on an extra lane; the lease is finished when that request ends. Lane 0
   * keeps using beforeRequest/afterRequest.
   */
  tryBorrowRequestSlot?: () => HpsRequestSlotLease | null | Promise<HpsRequestSlotLease | null>;
};

/** A GPU slot borrowed for one physical request on an extra PDF chunk lane. */
export type HpsRequestSlotLease = {
  finish(error: unknown | null): void;
};

export type HpsRequestStats = {
  /** PDF page range this request covered; absent for a single image. */
  range?: HpsPdfChunkRange;
  pages: number;
  /** Layout blocks HPS returned (after merging; most are one VLM call each). */
  regions: number;
  requestBytes: number;
  /** Wall time of the HTTP request, including GPU queueing inside HPS. */
  requestMs: number;
  /** Worker time spent cutting this page range out of the source PDF. */
  prepareMs?: number;
};

export type HpsPdfChunkRange = {
  /** Zero-based inclusive page index. */
  startPage: number;
  /** Zero-based exclusive page index. */
  endPage: number;
};

export type HpsPdfChunkState =
  | { status: 'completed'; result: Record<string, unknown> }
  | { status: 'split' };

export type HpsClient = {
  /** The client invokes request hooks around each independently bounded GPU request. */
  readonly managesPhysicalRequests?: true;
  healthOk(): Promise<boolean>;
  parse(input: HpsParseInput): Promise<HpsParseOutput>;
};

export type HpsParseOutput = {
  canonical: ParsedDocument;
  /** Successful HPS `payload.result`, untouched. */
  nativeResult: Record<string, unknown>;
};

export class HpsOverloadError extends Error {
  readonly retryable = true;
  constructor(message = 'HPS pool overloaded') {
    super(message);
    this.name = 'HpsOverloadError';
  }
}

export class HpsParseError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable = false) {
    super(message);
    this.name = 'HpsParseError';
    this.retryable = retryable;
  }
}

export class HpsAvailabilityError extends HpsParseError {
  readonly evidence: 'transport' | 'gateway';
  readonly status: 502 | 504 | null;

  constructor(message: string, evidence: 'transport' | 'gateway', status: 502 | 504 | null = null) {
    super(message, true);
    this.name = 'HpsAvailabilityError';
    this.evidence = evidence;
    this.status = status;
  }
}

export class HpsRequestTimeoutError extends HpsParseError {
  readonly timeoutMs: number;
  readonly code = 'ETIMEDOUT';

  constructor(
    timeoutMs: number,
    /** Only the client's own bounded chunk deadline proves a smaller range may help. */
    readonly bisectable = false
  ) {
    super(`HPS inference request timed out after ${timeoutMs}ms`, true);
    this.name = 'HpsRequestTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class HpsPdfPageTimeoutError extends HpsRequestTimeoutError {
  constructor(
    timeoutMs: number,
    readonly range: HpsPdfChunkRange,
    readonly attemptCount: number,
    readonly exhausted: boolean
  ) {
    super(timeoutMs);
    this.name = 'HpsPdfPageTimeoutError';
  }
}

export class HpsPdfChunkSplitError extends HpsRequestTimeoutError {
  constructor(
    timeoutMs: number,
    readonly range: HpsPdfChunkRange
  ) {
    super(timeoutMs);
    this.name = 'HpsPdfChunkSplitError';
  }
}

export class HpsPdfCheckpointError extends HpsParseError {
  constructor(
    message: string,
    readonly postDispatch = false
  ) {
    super(message, true);
    this.name = 'HpsPdfCheckpointError';
  }
}

export type HttpHpsClientOptions = {
  baseUrl: string;
  timeoutMs?: number;
  /** Internal PDF chunk size. This is not a document page limit. */
  pdfChunkPages?: number;
  /**
   * Max PDF chunks of one document in flight at once (default 1). Lanes past
   * the first run only while tryBorrowRequestSlot hands out a free slot.
   */
  pdfChunkConcurrency?: number;
  /** Fast timeout for multi-page chunks before recursively bisecting them. */
  chunkTimeoutMs?: number;
  /** Health endpoint path. Raw Paddle HPS exposes /health. */
  healthPath?: string;
  /** Optional headers for private HPS gateways. */
  headers?: Record<string, string>;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
  /** Canonical provenance provider and element-id segment (default Baidu / `paddle`). */
  provenanceProvider?: string;
  elementIdPrefix?: string;
};

/** Must expire before the 900s gateway/ALB deadlines so local timeout bisection wins. */
export const HPS_PARSE_TIMEOUT_MS = 870_000;
/** Set to "1" on a 504 from a gateway that stopped at its own bounded deadline (GLM-OCR). */
export const HPS_DEADLINE_HEADER = 'x-openparser-deadline-exceeded';
export const HPS_PDF_CHUNK_PAGES = 16;
export const HPS_PDF_CHUNK_TIMEOUT_MS = 300_000;
export const HPS_PDF_PAGE_MAX_ATTEMPTS = 5;

/**
 * Convert Paddle layout output while preserving HPS-specific retry metadata.
 */
export function mapLayoutResultsToParsedDocument(input: MapLayoutResultsInput): ParsedDocument {
  try {
    return mapLayoutResultsToParsedDocumentPure(input);
  } catch (error) {
    if (error instanceof PaddleAdapterError) {
      throw new HpsParseError(error.message, error.retryable);
    }
    throw error;
  }
}

/**
 * Paddle HPS adapter: POST /layout-parsing and map to canonical
 * ParsedDocument `openparser@1`.
 */
export function createHttpHpsClient(options: HttpHpsClientOptions): HpsClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const timeoutMs = options.timeoutMs ?? HPS_PARSE_TIMEOUT_MS;
  const pdfChunkPages = options.pdfChunkPages ?? HPS_PDF_CHUNK_PAGES;
  const pdfChunkConcurrency = options.pdfChunkConcurrency ?? 1;
  if (!Number.isInteger(pdfChunkConcurrency) || pdfChunkConcurrency < 1) {
    throw new TypeError('pdfChunkConcurrency must be a positive integer');
  }
  const chunkTimeoutMs = options.chunkTimeoutMs ?? HPS_PDF_CHUNK_TIMEOUT_MS;
  const healthPath = options.healthPath ?? '/health';
  const headers = options.headers ?? {};
  const fetchImpl = options.fetchImpl ?? fetch;
  if (!Number.isInteger(pdfChunkPages) || pdfChunkPages < 1) {
    throw new TypeError('pdfChunkPages must be a positive integer');
  }
  if (!Number.isFinite(chunkTimeoutMs) || chunkTimeoutMs <= 0) {
    throw new TypeError('chunkTimeoutMs must be positive');
  }

  return {
    managesPhysicalRequests: true,
    async healthOk(): Promise<boolean> {
      try {
        const response = await fetchImpl(`${baseUrl}${healthPath}`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) return false;
        const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
        if (!payload) return response.ok;
        const errorCode = payload.errorCode;
        return errorCode === 0 || errorCode === null || errorCode === undefined;
      } catch {
        return false;
      }
    },

    async parse(input: HpsParseInput): Promise<HpsParseOutput> {
      const nativeOptions: HpsNativeOptions = {
        formatBlockContent: true,
        visualize: false,
        useChartRecognition:
          input.nativeOptions?.useChartRecognition ?? LOCKED_HPS_NATIVE_OPTIONS.useChartRecognition,
        useOcrForImageBlock: input.nativeOptions?.useOcrForImageBlock ?? false,
        returnMarkdownImages:
          input.nativeOptions?.returnMarkdownImages ??
          LOCKED_HPS_NATIVE_OPTIONS.returnMarkdownImages,
        mergeLayoutBlocks:
          input.nativeOptions?.mergeLayoutBlocks ?? LOCKED_HPS_NATIVE_OPTIONS.mergeLayoutBlocks,
      };
      const makeRequest =
        <T>(
          acquire: () => Promise<T>,
          release: (slot: T, error: unknown | null) => Promise<void> | void
        ): HpsRangeRequest =>
        async (content, requestTimeoutMs, meta) => {
          input.signal?.throwIfAborted();
          const slot = await acquire();
          let result: Record<string, unknown>;
          const startedAt = performance.now();
          try {
            result = await requestLayoutResult({
              baseUrl,
              fetchImpl,
              content,
              mediaType: input.mediaType,
              nativeOptions,
              headers,
              signal: input.signal,
              timeoutMs: requestTimeoutMs,
            });
          } catch (error) {
            try {
              await release(slot, error);
            } catch {
              // Preserve the request failure that controls retry classification.
            }
            throw error;
          }
          await release(slot, null);
          const requestMs = Math.round(performance.now() - startedAt);
          const pageResults = result.layoutParsingResults as unknown[];
          try {
            input.onRequestComplete?.({
              range: meta?.range,
              pages: pageResults.length,
              regions: countLayoutRegions(pageResults),
              requestBytes: content.byteLength,
              requestMs,
              prepareMs: meta?.prepareMs,
            });
          } catch {
            // Metrics must never turn a successful GPU result into a failure.
          }
          return result;
        };
      const request = makeRequest(
        async () => {
          await input.beforeRequest?.();
        },
        (_slot, error) => input.afterRequest?.(error)
      );
      const borrow = input.tryBorrowRequestSlot;
      const extraLaneRequest =
        borrow && pdfChunkConcurrency > 1
          ? makeRequest(
              async () => {
                const lease = await borrow();
                if (!lease) throw new HpsLaneSlotUnavailableError();
                return lease;
              },
              (lease, error) => lease.finish(error)
            )
          : undefined;

      const result =
        input.mediaType === 'application/pdf'
          ? await parsePdfInBoundedChunks({
              content: input.content,
              chunkPages: pdfChunkPages,
              chunkTimeoutMs,
              singlePageTimeoutMs: timeoutMs,
              request,
              extraLaneRequest,
              concurrency: extraLaneRequest ? pdfChunkConcurrency : 1,
              loadChunk: input.loadPdfChunk,
              saveChunk: input.savePdfChunk,
              onChunkComplete: input.onPdfChunkComplete,
              loadPageTimeoutCount: input.loadPdfPageTimeoutCount,
              recordPageTimeout: input.recordPdfPageTimeout,
              signal: input.signal,
            })
          : await request(input.content, timeoutMs);
      const layoutResults = result.layoutParsingResults as unknown[];

      const pages = await resolvePageDimensions(
        input.content,
        input.mediaType,
        layoutResults.length
      );
      const dataInfoPages = readDataInfoPages(result as Record<string, unknown>);
      const layoutRecords = layoutResults as Record<string, unknown>[];
      let parsed: ParsedDocument;
      try {
        parsed = mapLayoutResultsToParsedDocumentPure({
          documentId: input.documentId,
          model: input.model,
          pages,
          layoutResults: layoutRecords,
          dataInfoPages,
          figureAssets: 'none',
          provider: options.provenanceProvider,
          elementIdPrefix: options.elementIdPrefix,
        });
      } catch (error) {
        if (error instanceof PaddleAdapterError) {
          throw new HpsParseError(error.message, error.retryable);
        }
        throw error;
      }
      return {
        canonical: ParsedDocumentSchema.parse(parsed),
        nativeResult: result as Record<string, unknown>,
      };
    },
  };
}

type LayoutRequestInput = {
  baseUrl: string;
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response>;
  content: Uint8Array;
  mediaType: string;
  nativeOptions: HpsNativeOptions;
  headers: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs: number;
};

async function requestLayoutResult(input: LayoutRequestInput): Promise<Record<string, unknown>> {
  const body = {
    file: Buffer.from(input.content).toString('base64'),
    fileType: input.mediaType === 'application/pdf' ? 0 : 1,
    formatBlockContent: input.nativeOptions.formatBlockContent,
    useChartRecognition: input.nativeOptions.useChartRecognition,
    useOcrForImageBlock: input.nativeOptions.useOcrForImageBlock,
    returnMarkdownImages: input.nativeOptions.returnMarkdownImages,
    mergeLayoutBlocks: input.nativeOptions.mergeLayoutBlocks,
    visualize: input.nativeOptions.visualize,
  };
  const timeoutSignal = AbortSignal.timeout(input.timeoutMs);
  const signal = input.signal ? AbortSignal.any([timeoutSignal, input.signal]) : timeoutSignal;

  let response: Response;
  try {
    response = await input.fetchImpl(`${input.baseUrl}/layout-parsing`, {
      method: 'POST',
      headers: { ...input.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (input.signal?.aborted) throw error;
    if (timeoutSignal.aborted) {
      throw new HpsRequestTimeoutError(input.timeoutMs, true);
    }
    if (!isDefinitivePreDispatchTransportError(error)) {
      // The request may already be executing upstream. Cool down and consume a
      // bounded attempt rather than immediately stacking duplicate GPU work.
      throw new HpsRequestTimeoutError(input.timeoutMs);
    }
    throw new HpsAvailabilityError(
      error instanceof Error ? error.message : 'HPS transport failed',
      'transport'
    );
  }

  if (response.status === 429 || response.status === 503) {
    throw new HpsOverloadError(`HPS overload HTTP ${response.status}`);
  }
  if (response.status === 504) {
    // The GLM gateway gives up on its own bounded deadline before ours fires
    // and says so; that proves a smaller range may help, like our own timeout.
    // A bare 504 (ALB, Paddle) does not.
    const gatewayDeadline = response.headers.get(HPS_DEADLINE_HEADER) === '1';
    throw new HpsRequestTimeoutError(input.timeoutMs, gatewayDeadline);
  }
  if (response.status === 502) {
    // A gateway error does not prove that inference was never dispatched.
    throw new HpsRequestTimeoutError(input.timeoutMs);
  }
  if (!response.ok) {
    throw new HpsParseError(`HPS request failed HTTP ${response.status}`, response.status >= 500);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const errorCode = payload.errorCode;
  if (errorCode !== 0 && errorCode !== null && errorCode !== undefined) {
    throw new HpsParseError(
      `HPS error ${String(errorCode)}: ${String(payload.errorMsg ?? 'layout-parsing failed')}`
    );
  }
  const result = payload.result;
  if (!result || typeof result !== 'object') {
    throw new HpsParseError('HPS response missing result');
  }
  const layoutResults = (result as { layoutParsingResults?: unknown }).layoutParsingResults;
  if (!Array.isArray(layoutResults) || layoutResults.length === 0) {
    throw new HpsParseError('HPS response missing layoutParsingResults');
  }
  return result as Record<string, unknown>;
}

type HpsRangeRequest = (
  content: Uint8Array,
  timeoutMs: number,
  meta?: { range: HpsPdfChunkRange; prepareMs: number }
) => Promise<Record<string, unknown>>;

/** Count layout regions across HPS page results; malformed pages count as zero. */
export function countLayoutRegions(pageResults: readonly unknown[]): number {
  let regions = 0;
  for (const page of pageResults) {
    const pruned = (page as { prunedResult?: { parsing_res_list?: unknown } } | null)?.prunedResult;
    const list = pruned?.parsing_res_list;
    if (Array.isArray(list)) regions += list.length;
  }
  return regions;
}

/** Internal: an extra lane found no free GPU slot; lane 0 takes the chunk. */
class HpsLaneSlotUnavailableError extends Error {
  constructor() {
    super('no free GPU slot for an extra PDF chunk lane');
    this.name = 'HpsLaneSlotUnavailableError';
  }
}

async function parsePdfInBoundedChunks(input: {
  content: Uint8Array;
  chunkPages: number;
  chunkTimeoutMs: number;
  singlePageTimeoutMs: number;
  request: HpsRangeRequest;
  /** Request path for lanes past the first; omitted when lanes are off. */
  extraLaneRequest?: HpsRangeRequest;
  concurrency: number;
  loadChunk?: (range: HpsPdfChunkRange) => Promise<HpsPdfChunkState | null>;
  saveChunk?: (range: HpsPdfChunkRange, state: HpsPdfChunkState) => Promise<boolean | void>;
  onChunkComplete?: (range: HpsPdfChunkRange, totalPages: number) => Promise<void>;
  loadPageTimeoutCount?: (range: HpsPdfChunkRange) => Promise<number>;
  recordPageTimeout?: (range: HpsPdfChunkRange, attempt: number) => Promise<void>;
  signal?: AbortSignal;
}): Promise<Record<string, unknown>> {
  let source: PDFDocument;
  try {
    input.signal?.throwIfAborted();
    source = await PDFDocument.load(input.content, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
    input.signal?.throwIfAborted();
  } catch (error) {
    throw new HpsParseError(
      error instanceof Error
        ? `PDF could not be prepared for bounded inference: ${error.message}`
        : 'PDF could not be prepared for bounded inference'
    );
  }
  const pageCount = source.getPageCount();
  if (pageCount === 0) throw new HpsParseError('PDF has no pages');

  const chunks: number[][] = [];
  for (let start = 0; start < pageCount; start += input.chunkPages) {
    chunks.push(
      Array.from(
        { length: Math.min(input.chunkPages, pageCount - start) },
        (_, index) => start + index
      )
    );
  }
  const runChunk = (pageIndexes: number[], request: HpsRangeRequest) =>
    requestPdfPagesWithTimeoutBisect({
      source,
      pageIndexes,
      chunkTimeoutMs: input.chunkTimeoutMs,
      singlePageTimeoutMs: input.singlePageTimeoutMs,
      request,
      loadChunk: input.loadChunk,
      saveChunk: input.saveChunk,
      onChunkComplete: input.onChunkComplete
        ? (range) => input.onChunkComplete!(range, pageCount)
        : undefined,
      loadPageTimeoutCount: input.loadPageTimeoutCount,
      recordPageTimeout: input.recordPageTimeout,
      signal: input.signal,
    });

  // Lane 0 works through the chunks with the job's own GPU slot, exactly as a
  // single lane always has, and stays until every chunk is done. Extra lanes
  // take chunks while a slot is lent; the first refusal hands that chunk back
  // to lane 0 and ends the extra lane for this document (completed sub-ranges
  // are checkpointed, so nothing is redone). Results are kept by chunk index
  // so pages merge in order whatever finishes first. On the first error no new
  // chunk starts, chunks in flight finish (and save their checkpoints), and
  // the error of the lowest chunk is raised.
  const results: Record<string, unknown>[][] = new Array(chunks.length);
  const queue = chunks.map((_, index) => index);
  const first: { failure: { index: number; error: unknown } | null } = { failure: null };
  const fail = (index: number, error: unknown) => {
    // Another lane may have failed while this chunk ran.
    const prior = first.failure as { index: number; error: unknown } | null;
    if (prior === null || index < prior.index) first.failure = { index, error };
  };
  let extraInFlight = 0;
  let wakeLaneZero: (() => void) | null = null;
  const notifyLaneZero = () => {
    const wake = wakeLaneZero;
    wakeLaneZero = null;
    wake?.();
  };
  const laneZero = async (): Promise<void> => {
    while (first.failure === null) {
      input.signal?.throwIfAborted();
      if (queue.length === 0) {
        // Done only once no extra lane can still hand a chunk back.
        if (extraInFlight === 0) return;
        await new Promise<void>((resolve) => {
          wakeLaneZero = resolve;
        });
        continue;
      }
      const index = queue.shift()!;
      try {
        results[index] = await runChunk(chunks[index]!, input.request);
      } catch (error) {
        fail(index, error);
        return;
      }
    }
  };
  const extraLane = async (request: HpsRangeRequest): Promise<void> => {
    while (queue.length > 0 && first.failure === null) {
      const index = queue.shift()!;
      extraInFlight += 1;
      try {
        results[index] = await runChunk(chunks[index]!, request);
      } catch (error) {
        if (error instanceof HpsLaneSlotUnavailableError) {
          queue.unshift(index);
          return;
        }
        fail(index, error);
        return;
      } finally {
        extraInFlight -= 1;
        notifyLaneZero();
      }
    }
  };
  const lanes = [laneZero()];
  if (input.extraLaneRequest) {
    const extraLanes = Math.min(input.concurrency, chunks.length) - 1;
    for (let i = 0; i < extraLanes; i++) lanes.push(extraLane(input.extraLaneRequest));
  }
  const settled = await Promise.allSettled(lanes);
  if (first.failure !== null) throw first.failure.error;
  for (const outcome of settled) {
    if (outcome.status === 'rejected') throw outcome.reason;
  }
  return mergeLayoutResults(results.flat());
}

async function requestPdfPagesWithTimeoutBisect(input: {
  source: PDFDocument;
  pageIndexes: number[];
  chunkTimeoutMs: number;
  singlePageTimeoutMs: number;
  request: HpsRangeRequest;
  loadChunk?: (range: HpsPdfChunkRange) => Promise<HpsPdfChunkState | null>;
  saveChunk?: (range: HpsPdfChunkRange, state: HpsPdfChunkState) => Promise<boolean | void>;
  onChunkComplete?: (range: HpsPdfChunkRange) => Promise<void>;
  loadPageTimeoutCount?: (range: HpsPdfChunkRange) => Promise<number>;
  recordPageTimeout?: (range: HpsPdfChunkRange, attempt: number) => Promise<void>;
  signal?: AbortSignal;
}): Promise<Record<string, unknown>[]> {
  const range = {
    startPage: input.pageIndexes[0]!,
    endPage: input.pageIndexes.at(-1)! + 1,
  };
  input.signal?.throwIfAborted();
  const cached = await input.loadChunk?.(range);
  input.signal?.throwIfAborted();
  if (cached?.status === 'completed') {
    try {
      validateBoundedPageResult(cached.result, input.pageIndexes.length, range);
      await input.onChunkComplete?.(range);
      return [cached.result];
    } catch (error) {
      if (!(error instanceof HpsParseError)) throw error;
      // An immutable malformed checkpoint can never heal through retries.
      // Ignore it and use a fresh bounded result for this claim.
    }
  }
  if (cached?.status === 'split') {
    if (input.pageIndexes.length === 1) {
      throw new HpsParseError('invalid split checkpoint for a single PDF page');
    }
    return requestSplitPdfPages(input);
  }
  const priorTimeoutCount =
    input.pageIndexes.length === 1 ? ((await input.loadPageTimeoutCount?.(range)) ?? 0) : 0;
  input.signal?.throwIfAborted();
  if (input.pageIndexes.length === 1 && priorTimeoutCount >= HPS_PDF_PAGE_MAX_ATTEMPTS) {
    throw new HpsPdfPageTimeoutError(input.singlePageTimeoutMs, range, priorTimeoutCount, true);
  }

  let bytes: Uint8Array;
  const prepareStartedAt = performance.now();
  try {
    const chunk = await PDFDocument.create();
    const pages = await chunk.copyPages(input.source, input.pageIndexes);
    for (const page of pages) chunk.addPage(page);
    bytes = await chunk.save({ updateFieldAppearances: false });
    input.signal?.throwIfAborted();
  } catch (error) {
    if (input.signal?.aborted) throw error;
    throw new HpsParseError(
      error instanceof Error
        ? `PDF page range could not be prepared for bounded inference: ${error.message}`
        : 'PDF page range could not be prepared for bounded inference'
    );
  }

  try {
    const result = await input.request(
      bytes,
      input.pageIndexes.length === 1 ? input.singlePageTimeoutMs : input.chunkTimeoutMs,
      { range, prepareMs: Math.round(performance.now() - prepareStartedAt) }
    );
    validateBoundedPageResult(result, input.pageIndexes.length, range);
    input.signal?.throwIfAborted();
    await input.saveChunk?.(range, { status: 'completed', result });
    input.signal?.throwIfAborted();
    await input.onChunkComplete?.(range);
    return [result];
  } catch (error) {
    if (!(error instanceof HpsRequestTimeoutError)) throw error;
    if (input.pageIndexes.length === 1) {
      if (!error.bisectable) throw error;
      if (!input.loadPageTimeoutCount || !input.recordPageTimeout) throw error;
      const attemptCount = priorTimeoutCount + 1;
      input.signal?.throwIfAborted();
      await input.recordPageTimeout(range, attemptCount);
      throw new HpsPdfPageTimeoutError(
        error.timeoutMs,
        range,
        attemptCount,
        attemptCount >= HPS_PDF_PAGE_MAX_ATTEMPTS
      );
    }
    if (!error.bisectable) throw error;
    if (input.saveChunk) {
      input.signal?.throwIfAborted();
      const persisted = await input.saveChunk(range, { status: 'split' });
      if (persisted === false) return requestSplitPdfPages(input);
      throw new HpsPdfChunkSplitError(error.timeoutMs, range);
    }
    return requestSplitPdfPages(input);
  }
}

function validateBoundedPageResult(
  result: Record<string, unknown>,
  expectedPages: number,
  range: HpsPdfChunkRange
): void {
  const pageResults = result.layoutParsingResults;
  if (!Array.isArray(pageResults) || pageResults.length !== expectedPages) {
    throw new HpsParseError(
      `HPS page-count mismatch for bounded range ${range.startPage + 1}-${range.endPage}: ` +
        `expected ${expectedPages}, received ${Array.isArray(pageResults) ? pageResults.length : 0}`,
      true
    );
  }
  const dataInfo = result.dataInfo;
  const dataInfoPages =
    dataInfo && typeof dataInfo === 'object' ? (dataInfo as { pages?: unknown }).pages : undefined;
  if (Array.isArray(dataInfoPages) && dataInfoPages.length !== expectedPages) {
    throw new HpsParseError(
      `HPS page-metadata mismatch for bounded range ${range.startPage + 1}-${range.endPage}: ` +
        `expected ${expectedPages}, received ${dataInfoPages.length}`,
      true
    );
  }
}

async function requestSplitPdfPages(input: {
  source: PDFDocument;
  pageIndexes: number[];
  chunkTimeoutMs: number;
  singlePageTimeoutMs: number;
  request: HpsRangeRequest;
  loadChunk?: (range: HpsPdfChunkRange) => Promise<HpsPdfChunkState | null>;
  saveChunk?: (range: HpsPdfChunkRange, state: HpsPdfChunkState) => Promise<boolean | void>;
  onChunkComplete?: (range: HpsPdfChunkRange) => Promise<void>;
  loadPageTimeoutCount?: (range: HpsPdfChunkRange) => Promise<number>;
  recordPageTimeout?: (range: HpsPdfChunkRange, attempt: number) => Promise<void>;
  signal?: AbortSignal;
}): Promise<Record<string, unknown>[]> {
  const midpoint = Math.ceil(input.pageIndexes.length / 2);
  const left = await requestPdfPagesWithTimeoutBisect({
    ...input,
    pageIndexes: input.pageIndexes.slice(0, midpoint),
  });
  const right = await requestPdfPagesWithTimeoutBisect({
    ...input,
    pageIndexes: input.pageIndexes.slice(midpoint),
  });
  return [...left, ...right];
}

function mergeLayoutResults(results: Record<string, unknown>[]): Record<string, unknown> {
  const first = results[0];
  if (!first) throw new HpsParseError('HPS response missing result');
  const layoutParsingResults = results.flatMap((result) => {
    const pages = result.layoutParsingResults;
    return Array.isArray(pages) ? pages : [];
  });
  const dataInfoPageGroups = results.map((result) => {
    const dataInfo = result.dataInfo;
    if (!dataInfo || typeof dataInfo !== 'object') return null;
    const pages = (dataInfo as { pages?: unknown }).pages;
    return Array.isArray(pages) ? pages : null;
  });
  const merged: Record<string, unknown> = { ...first, layoutParsingResults };
  if (dataInfoPageGroups.every((pages) => pages !== null)) {
    const firstDataInfo =
      first.dataInfo && typeof first.dataInfo === 'object'
        ? (first.dataInfo as Record<string, unknown>)
        : {};
    merged.dataInfo = { ...firstDataInfo, pages: dataInfoPageGroups.flat() };
  } else {
    // Partial metadata cannot be aligned safely across independently parsed
    // chunks. PDF page dimensions remain available as the canonical fallback.
    delete merged.dataInfo;
  }
  return merged;
}

function isDefinitivePreDispatchTransportError(error: unknown): boolean {
  const cause =
    typeof error === 'object' && error !== null && 'cause' in error
      ? (error as { cause?: unknown }).cause
      : null;
  const code =
    typeof cause === 'object' && cause !== null && 'code' in cause
      ? String((cause as { code?: unknown }).code ?? '')
      : '';
  if (['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ENETUNREACH'].includes(code)) return true;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    message.includes('connection refused') ||
    message.includes('getaddrinfo') ||
    message.includes('host unreachable') ||
    message.includes('network unreachable')
  );
}

/**
 * Media-derived page dims used only as a last-resort fallback when HPS does
 * not report raster width/height. For PDFs these are PDF points (not the
 * Paddle raster space); for images they are native pixel dimensions.
 */
async function resolvePageDimensions(
  content: Uint8Array,
  mediaType: string,
  pageCount: number
): Promise<PageDims[]> {
  if (mediaType === 'application/pdf') {
    const pdf = await PDFDocument.load(content, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
    const count = pdf.getPageCount();
    const pages: PageDims[] = [];
    for (let i = 0; i < count; i++) {
      const page = pdf.getPage(i);
      const { width, height } = page.getSize();
      pages.push({
        number: i + 1,
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
      });
    }
    if (pages.length === 0) {
      throw new HpsParseError('PDF has no pages');
    }
    // Prefer HPS page count when it differs (some pipelines merge/split).
    if (pages.length !== pageCount) {
      while (pages.length < pageCount) {
        const last = pages[pages.length - 1]!;
        pages.push({ ...last, number: pages.length + 1 });
      }
      return pages.slice(0, pageCount);
    }
    return pages;
  }

  if (mediaType === 'image/png' || mediaType === 'image/jpeg') {
    const dims = readImageDimensions(content, mediaType);
    if (!dims) throw new HpsParseError('uploaded image is malformed');
    return Array.from({ length: pageCount }, (_, i) => ({
      number: i + 1,
      width: dims.width,
      height: dims.height,
    }));
  }

  return Array.from({ length: pageCount }, (_, i) => ({
    number: i + 1,
    width: 1000,
    height: 1000,
  }));
}

function readImageDimensions(
  content: Uint8Array,
  mediaType: 'image/png' | 'image/jpeg'
): { width: number; height: number } | null {
  if (mediaType === 'image/png') {
    if (content.length < 24) return null;
    const chunkType = String.fromCharCode(content[12]!, content[13]!, content[14]!, content[15]!);
    if (chunkType !== 'IHDR') return null;
    const width = readU32(content, 16);
    const height = readU32(content, 20);
    return width > 0 && height > 0 ? { width, height } : null;
  }

  let offset = 2;
  while (offset + 9 < content.length) {
    if (content[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = content[offset + 1]!;
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = (content[offset + 2]! << 8) | content[offset + 3]!;
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = (content[offset + 5]! << 8) | content[offset + 6]!;
      const width = (content[offset + 7]! << 8) | content[offset + 8]!;
      return width > 0 && height > 0 ? { width, height } : null;
    }
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset]! << 24) |
      (bytes[offset + 1]! << 16) |
      (bytes[offset + 2]! << 8) |
      bytes[offset + 3]!) >>>
    0
  );
}
