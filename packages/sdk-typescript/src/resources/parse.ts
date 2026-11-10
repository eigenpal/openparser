import type { Client } from '../generated/client';
import { parseAsync, parseBatch, parseSync } from '../generated/sdk.gen';
import type { ParseRequest } from '../generated/types.gen';
import { admitWithKey, type AdmissionOptions, type Dispatch } from './admission';

export interface ParseAdmissionOptions extends AdmissionOptions {}

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
    return admitWithKey(this.dispatch, options.idempotencyKey, (headers) =>
      parseSync({
        client: this.client,
        headers,
        body: { request, file },
        signal: options.signal,
      })
    );
  }

  async async(request: ParseRequest, file?: Blob | File, options: ParseAsyncOptions = {}) {
    return admitWithKey(this.dispatch, options.idempotencyKey, (headers) =>
      parseAsync({
        client: this.client,
        headers,
        body: { request, file },
        signal: options.signal,
      })
    );
  }

  async batch(options: ParseBatchOptions) {
    return admitWithKey(this.dispatch, options.idempotencyKey, (headers) =>
      parseBatch({
        client: this.client,
        headers,
        body: options.body,
        signal: options.signal,
      })
    );
  }
}
