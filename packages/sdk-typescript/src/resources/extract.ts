import type { OperationResult, RequestRetryContext } from '../client';
import type { Client } from '../generated/client';
import { extractAsync, extractBatch, extractSync, suggestSchema } from '../generated/sdk.gen';
import type { ExtractRequest } from '../generated/types.gen';
import { createIdempotencyKey } from '../lib/idempotency';

type Dispatch = <T>(
  call: () => Promise<OperationResult<T>>,
  retryContext: RequestRetryContext
) => Promise<T>;
type SignalOptions = { signal?: AbortSignal };

export interface ExtractAdmissionOptions extends SignalOptions {
  idempotencyKey?: string;
}

export interface ExtractSyncOptions extends ExtractAdmissionOptions {}

export interface ExtractAsyncOptions extends ExtractAdmissionOptions {}

export interface ExtractBatchOptions extends ExtractAdmissionOptions {
  body: Parameters<typeof extractBatch>[0]['body'];
}

export class ExtractResource {
  constructor(
    private readonly client: Client,
    private readonly dispatch: Dispatch
  ) {}

  async sync(request: ExtractRequest, file?: Blob | File, options: ExtractSyncOptions = {}) {
    const idempotencyKey = options.idempotencyKey ?? createIdempotencyKey();
    return this.dispatch(
      () =>
        extractSync({
          client: this.client,
          headers: { 'Idempotency-Key': idempotencyKey },
          body: { request, file },
          signal: options.signal,
        }),
      { method: 'POST', idempotencyKey }
    );
  }

  async async(request: ExtractRequest, file?: Blob | File, options: ExtractAsyncOptions = {}) {
    const idempotencyKey = options.idempotencyKey ?? createIdempotencyKey();
    return this.dispatch(
      () =>
        extractAsync({
          client: this.client,
          headers: { 'Idempotency-Key': idempotencyKey },
          body: { request, file },
          signal: options.signal,
        }),
      { method: 'POST', idempotencyKey }
    );
  }

  async batch(options: ExtractBatchOptions) {
    const idempotencyKey = options.idempotencyKey ?? createIdempotencyKey();
    return this.dispatch(
      () =>
        extractBatch({
          client: this.client,
          headers: { 'Idempotency-Key': idempotencyKey },
          body: options.body,
          signal: options.signal,
        }),
      { method: 'POST', idempotencyKey }
    );
  }

  async suggestSchema(
    body: Parameters<typeof suggestSchema>[0]['body'],
    options: SignalOptions = {}
  ) {
    return this.dispatch(
      () =>
        suggestSchema({
          client: this.client,
          body,
          signal: options.signal,
        }),
      { method: 'POST' }
    );
  }
}
