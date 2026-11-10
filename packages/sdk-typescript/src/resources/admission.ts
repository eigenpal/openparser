import type { OperationResult, RequestRetryContext } from '../client';
import { createIdempotencyKey } from '../lib/idempotency';

export type Dispatch = <T>(
  call: () => Promise<OperationResult<T>>,
  retryContext: RequestRetryContext
) => Promise<T>;

export type SignalOptions = { signal?: AbortSignal };

export interface AdmissionOptions extends SignalOptions {
  idempotencyKey?: string;
}

/**
 * Sends a POST admission request (parse or extract) under one idempotency key,
 * sent both as the Idempotency-Key header and as the retry context.
 */
export function admitWithKey<T>(
  dispatch: Dispatch,
  idempotencyKey: string | undefined,
  call: (headers: { 'Idempotency-Key': string }) => Promise<OperationResult<T>>
): Promise<T> {
  const key = idempotencyKey ?? createIdempotencyKey();
  return dispatch(() => call({ 'Idempotency-Key': key }), { method: 'POST', idempotencyKey: key });
}
