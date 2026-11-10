import type { Client } from '../generated/client';
import { extractAsync, extractBatch, extractSync, suggestSchema } from '../generated/sdk.gen';
import type { ExtractRequest } from '../generated/types.gen';
import {
  admitWithKey,
  type AdmissionOptions,
  type Dispatch,
  type SignalOptions,
} from './admission';

export interface ExtractAdmissionOptions extends AdmissionOptions {}

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
    return admitWithKey(this.dispatch, options.idempotencyKey, (headers) =>
      extractSync({
        client: this.client,
        headers,
        body: { request, file },
        signal: options.signal,
      })
    );
  }

  async async(request: ExtractRequest, file?: Blob | File, options: ExtractAsyncOptions = {}) {
    return admitWithKey(this.dispatch, options.idempotencyKey, (headers) =>
      extractAsync({
        client: this.client,
        headers,
        body: { request, file },
        signal: options.signal,
      })
    );
  }

  async batch(options: ExtractBatchOptions) {
    return admitWithKey(this.dispatch, options.idempotencyKey, (headers) =>
      extractBatch({
        client: this.client,
        headers,
        body: options.body,
        signal: options.signal,
      })
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
