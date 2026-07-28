import type { OperationResult, RequestRetryContext } from '../client';
import type { Client } from '../generated/client';
import { createFile, deleteFile, getFile, getFileContent } from '../generated/sdk.gen';

type Dispatch = <T>(
  call: () => Promise<OperationResult<T>>,
  retryContext: RequestRetryContext
) => Promise<T>;
type SignalOptions = { signal?: AbortSignal };

export class FilesResource {
  constructor(
    private readonly client: Client,
    private readonly dispatch: Dispatch
  ) {}

  async upload(file: Blob | File, options: SignalOptions = {}) {
    return this.dispatch(
      () =>
        createFile({
          client: this.client,
          body: { file },
          signal: options.signal,
        }),
      { method: 'POST' }
    );
  }

  async get(fileId: string, options: SignalOptions = {}) {
    return this.dispatch(
      () =>
        getFile({
          client: this.client,
          path: { id: fileId },
          signal: options.signal,
        }),
      { method: 'GET' }
    );
  }

  async download(fileId: string, options: SignalOptions = {}): Promise<Blob> {
    return this.dispatch(
      async () => {
        const response = await getFileContent({
          client: this.client,
          path: { id: fileId },
          signal: options.signal,
        });
        return response as OperationResult<Blob>;
      },
      { method: 'GET', responseType: 'binary' }
    );
  }

  async delete(fileId: string, options: SignalOptions = {}) {
    return this.dispatch(
      () =>
        deleteFile({
          client: this.client,
          path: { id: fileId },
          signal: options.signal,
        }),
      { method: 'DELETE' }
    );
  }
}
