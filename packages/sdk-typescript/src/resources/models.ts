import type { OperationResult, RequestRetryContext } from '../client';
import type { Client } from '../generated/client';
import { listLlmModels, listOcrModels } from '../generated/sdk.gen';
import type { LlmModelsMode } from '../generated/types.gen';

type Dispatch = <T>(
  call: () => Promise<OperationResult<T>>,
  retryContext: RequestRetryContext
) => Promise<T>;
type SignalOptions = { signal?: AbortSignal };

export interface ListLlmModelsOptions extends SignalOptions {
  mode?: LlmModelsMode;
  q?: string;
  page?: number;
  limit?: number;
}

export class ModelsResource {
  constructor(
    private readonly client: Client,
    private readonly dispatch: Dispatch
  ) {}

  async ocr(options: SignalOptions = {}) {
    return this.dispatch(
      () =>
        listOcrModels({
          client: this.client,
          signal: options.signal,
        }),
      { method: 'GET' }
    );
  }

  async llm(options: ListLlmModelsOptions = {}) {
    const { signal, ...query } = options;
    return this.dispatch(
      () =>
        listLlmModels({
          client: this.client,
          query: Object.keys(query).length > 0 ? query : undefined,
          signal,
        }),
      { method: 'GET' }
    );
  }
}
