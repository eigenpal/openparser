import type { OperationResult, RequestRetryContext } from '../client';
import type { Client } from '../generated/client';
import {
  createExtractionPipeline,
  deleteExtractionPipeline,
  getExtractionPipeline,
  listExtractionPipelines,
  updateExtractionPipeline,
} from '../generated/sdk.gen';
import type {
  CreateExtractionPipelineRequest,
  UpdateExtractionPipelineRequest,
} from '../generated/types.gen';

type Dispatch = <T>(
  call: () => Promise<OperationResult<T>>,
  retryContext: RequestRetryContext
) => Promise<T>;
type SignalOptions = { signal?: AbortSignal };

export class PipelinesResource {
  constructor(
    private readonly client: Client,
    private readonly dispatch: Dispatch
  ) {}

  async list(options: SignalOptions = {}) {
    return this.dispatch(
      () =>
        listExtractionPipelines({
          client: this.client,
          signal: options.signal,
        }),
      { method: 'GET' }
    );
  }

  async create(body: CreateExtractionPipelineRequest, options: SignalOptions = {}) {
    return this.dispatch(
      () =>
        createExtractionPipeline({
          client: this.client,
          body,
          signal: options.signal,
        }),
      { method: 'POST' }
    );
  }

  async get(pipelineId: string, options: SignalOptions = {}) {
    return this.dispatch(
      () =>
        getExtractionPipeline({
          client: this.client,
          path: { id: pipelineId },
          signal: options.signal,
        }),
      { method: 'GET' }
    );
  }

  async update(
    pipelineId: string,
    body: UpdateExtractionPipelineRequest,
    options: SignalOptions = {}
  ) {
    return this.dispatch(
      () =>
        updateExtractionPipeline({
          client: this.client,
          path: { id: pipelineId },
          body,
          signal: options.signal,
        }),
      { method: 'PATCH' }
    );
  }

  async delete(pipelineId: string, options: SignalOptions = {}) {
    return this.dispatch(
      () =>
        deleteExtractionPipeline({
          client: this.client,
          path: { id: pipelineId },
          signal: options.signal,
        }),
      { method: 'DELETE' }
    );
  }
}
