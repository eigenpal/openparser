import type { OperationResult, RequestRetryContext } from '../client';
import type { Client } from '../generated/client';
import { parseAsync, parseBatch, parseSync } from '../generated/sdk.gen';
import type { ParseRequest } from '../generated/types.gen';
import { createIdempotencyKey } from '../lib/idempotency';

type Dispatch = <T>(
  call: () => Promise<OperationResult<T>>,
  retryContext: RequestRetryContext
) => Promise<T>;
type SignalOptions = { signal?: AbortSignal };

export interface ParseAdmissionOptions extends SignalOptions {
  idempotencyKey?: string;
}

export interface ParseSyncOptions extends ParseAdmissionOptions {}

export interface ParseAsyncOptions extends ParseAdmissionOptions {}

export interface ParseBatchOptions extends ParseAdmissionOptions {
  body: Parameters<typeof parseBatch>[0]['body'];
}

export class ParseResource {
  constructor(
    private readonly client: Client,
    private readonly dispatch: Dispatch
  ) {}

  async sync(request: ParseRequest, file?: Blob | File, options: ParseSyncOptions = {}) {
    const idempotencyKey = options.idempotencyKey ?? createIdempotencyKey();
    return this.dispatch(
      () =>
        parseSync({
          client: this.client,
          headers: { 'Idempotency-Key': idempotencyKey },
          body: { request, file },
          signal: options.signal,
        }),
      { method: 'POST', idempotencyKey }
    );
  }

  async async(request: ParseRequest, file?: Blob | File, options: ParseAsyncOptions = {}) {
    const idempotencyKey = options.idempotencyKey ?? createIdempotencyKey();
    return this.dispatch(
      () =>
        parseAsync({
          client: this.client,
          headers: { 'Idempotency-Key': idempotencyKey },
          body: { request, file },
          signal: options.signal,
        }),
      { method: 'POST', idempotencyKey }
    );
  }

  async batch(options: ParseBatchOptions) {
    const idempotencyKey = options.idempotencyKey ?? createIdempotencyKey();
    return this.dispatch(
      () =>
        parseBatch({
          client: this.client,
          headers: { 'Idempotency-Key': idempotencyKey },
          body: options.body,
          signal: options.signal,
        }),
      { method: 'POST', idempotencyKey }
    );
  }
}
