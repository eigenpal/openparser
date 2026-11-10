import type { OperationResult, RequestRetryContext } from '../client';
import { OpenParserTimeoutError } from '../errors';
import type { Client } from '../generated/client';
import {
  completeExtractionReview,
  getExtractionReview,
  getJob,
  getJobResult,
  getJobSource,
  listJobs,
  reopenExtractionReview,
  updateExtractionReview,
} from '../generated/sdk.gen';
import type {
  CompleteExtractionReviewRequest,
  JobOperation,
  JobStatus,
  OcrOutputFormat,
  ReopenExtractionReviewRequest,
  UpdateExtractionReviewRequest,
} from '../generated/types.gen';

type Dispatch = <T>(
  call: () => Promise<OperationResult<T>>,
  retryContext: RequestRetryContext
) => Promise<T>;
type SignalOptions = { signal?: AbortSignal };

export interface ListJobsOptions extends SignalOptions {
  cursor?: string;
  limit?: number;
  status?: JobStatus;
  operation?: JobOperation;
}

export interface GetJobOptions extends SignalOptions {
  cursor?: string;
  limit?: number;
}

export interface GetJobResultOptions extends SignalOptions {
  format?: OcrOutputFormat;
}

export interface WaitForJobOptions extends SignalOptions {
  /** Give up after this long (default 300,000 ms). */
  timeoutMs?: number;
  /** Delay between polls (default 2,000 ms). */
  pollIntervalMs?: number;
}

const TERMINAL_JOB_STATUSES: ReadonlySet<JobStatus> = new Set<JobStatus>([
  'succeeded',
  'failed',
  'indeterminate',
]);
const DEFAULT_WAIT_TIMEOUT_MS = 300_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export class JobsResource {
  constructor(
    private readonly client: Client,
    private readonly dispatch: Dispatch
  ) {}

  async list(options: ListJobsOptions = {}) {
    const { signal, ...query } = options;
    return this.dispatch(
      () =>
        listJobs({
          client: this.client,
          query: Object.keys(query).length > 0 ? query : undefined,
          signal,
        }),
      { method: 'GET' }
    );
  }

  async get(jobId: string, options: GetJobOptions = {}) {
    const { signal, ...query } = options;
    return this.dispatch(
      () =>
        getJob({
          client: this.client,
          path: { id: jobId },
          query: Object.keys(query).length > 0 ? query : undefined,
          signal,
        }),
      { method: 'GET' }
    );
  }

  /** Poll `jobs.get` until the job reaches a terminal status. */
  async waitFor(jobId: string, options: WaitForJobOptions = {}) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
    const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const job = await this.get(jobId, { signal: options.signal });
      if (TERMINAL_JOB_STATUSES.has(job.status)) return job;
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        throw new OpenParserTimeoutError(`job ${jobId} did not finish within ${timeoutMs}ms`);
      }
      await sleep(Math.min(pollIntervalMs, remainingMs), options.signal);
    }
  }

  async result(jobId: string, options: GetJobResultOptions = {}) {
    const { signal, format } = options;
    return this.dispatch(
      () =>
        getJobResult({
          client: this.client,
          path: { id: jobId },
          query: format ? { format } : undefined,
          signal,
        }),
      { method: 'GET' }
    );
  }

  async source(jobId: string, options: SignalOptions = {}): Promise<Blob> {
    return this.dispatch(
      async () => {
        const response = await getJobSource({
          client: this.client,
          path: { id: jobId },
          signal: options.signal,
        });
        return response as OperationResult<Blob>;
      },
      { method: 'GET', responseType: 'binary' }
    );
  }

  async review(jobId: string, options: SignalOptions = {}) {
    return this.dispatch(
      () =>
        getExtractionReview({
          client: this.client,
          path: { id: jobId },
          signal: options.signal,
        }),
      { method: 'GET' }
    );
  }

  async updateReview(
    jobId: string,
    body: UpdateExtractionReviewRequest,
    options: SignalOptions = {}
  ) {
    return this.dispatch(
      () =>
        updateExtractionReview({
          client: this.client,
          path: { id: jobId },
          body,
          signal: options.signal,
        }),
      { method: 'PATCH' }
    );
  }

  async completeReview(
    jobId: string,
    body: CompleteExtractionReviewRequest,
    options: SignalOptions = {}
  ) {
    return this.dispatch(
      () =>
        completeExtractionReview({
          client: this.client,
          path: { id: jobId },
          body,
          signal: options.signal,
        }),
      { method: 'POST' }
    );
  }

  async reopenReview(
    jobId: string,
    body: ReopenExtractionReviewRequest,
    options: SignalOptions = {}
  ) {
    return this.dispatch(
      () =>
        reopenExtractionReview({
          client: this.client,
          path: { id: jobId },
          body,
          signal: options.signal,
        }),
      { method: 'POST' }
    );
  }
}
