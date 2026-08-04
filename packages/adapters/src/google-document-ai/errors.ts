/**
 * Errors from pure Google Document AI → openparser@1 conversion (no transport).
 */
export class GoogleDocumentAiAdapterError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = 'GoogleDocumentAiAdapterError';
    this.retryable = retryable;
  }
}
