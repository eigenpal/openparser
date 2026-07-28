/** HTTP methods with no server-side side effects — safe to replay on ambiguity. */
const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD']);

export interface RequestRetryContext {
  method: string;
  /** Non-empty Idempotency-Key when the server deduplicates admission. */
  idempotencyKey?: string;
}

export function isRetriableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

/**
 * Whether an ambiguous failure (5xx, 429, or transport error) may be retried.
 *
 * Retries are allowed for safe reads and for mutations explicitly keyed with
 * Idempotency-Key (parse/extract admission). Other mutations are fail-fast so a
 * post-commit network failure cannot duplicate work server-side.
 */
export function isRetryableRequest(context: RequestRetryContext): boolean {
  const method = context.method.toUpperCase();
  if (SAFE_HTTP_METHODS.has(method)) return true;

  const key = context.idempotencyKey?.trim();
  return key !== undefined && key.length > 0;
}
