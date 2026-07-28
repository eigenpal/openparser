/**
 * Errors from pure Paddle HPS → openparser@1 conversion (no transport).
 */
export class PaddleAdapterError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = 'PaddleAdapterError';
    this.retryable = retryable;
  }
}
