import type { OperationResult, RequestRetryContext } from '../client';
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
