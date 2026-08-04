/**
 * Errors from pure AWS Textract → openparser@1 conversion (no transport).
 */
export class AwsTextractAdapterError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = 'AwsTextractAdapterError';
    this.retryable = retryable;
  }
}

/** HTTP/SDK client and option validation errors for AWS Textract. */
export class AwsTextractError extends Error {
  readonly retryable: boolean;
  readonly providerCode?: string;

  constructor(
    message: string,
    options?: { retryable?: boolean; providerCode?: string; cause?: unknown }
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AwsTextractError';
    this.retryable = options?.retryable ?? false;
    this.providerCode = options?.providerCode;
  }
}
