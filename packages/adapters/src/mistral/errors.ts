/**
 * Errors from pure Mistral OCR → openparser@1 conversion (no transport).
 */
export class MistralAdapterError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = 'MistralAdapterError';
    this.retryable = retryable;
  }
}

/** HTTP client and option validation errors for Mistral OCR. */
export class MistralOcrError extends Error {
  readonly retryable: boolean;
  readonly dispatchAmbiguous: boolean;
  /** HTTP status of the failed Mistral response, when there was one. */
  readonly status?: number;
  /** Mistral's error `code` or `type`, restricted to identifier characters. */
  readonly providerCode?: string;

  constructor(
    message: string,
    retryable = false,
    dispatchAmbiguous = false,
    provider: { status?: number; code?: string } = {}
  ) {
    super(message);
    this.name = 'MistralOcrError';
    this.retryable = retryable;
    this.dispatchAmbiguous = dispatchAmbiguous;
    this.status = provider.status;
    this.providerCode = provider.code;
  }
}
