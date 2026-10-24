/**
 * Errors from pure Azure Document Intelligence → openparser@1 conversion (no transport).
 */
export class AzureDocumentIntelligenceAdapterError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = 'AzureDocumentIntelligenceAdapterError';
    this.retryable = retryable;
  }
}

/** What Azure said when it refused a request: HTTP status and its most specific error code. */
export type AzureDiProviderFailure = {
  status?: number;
  code?: string;
  /** Azure refused the document itself (bad dimensions, size, or content), so a retry cannot help. */
  inputRejected?: boolean;
};

/**
 * Transport / request validation errors from the Azure Document Intelligence HTTP client.
 */
export class AzureDiError extends Error {
  readonly retryable: boolean;
  readonly dispatchAmbiguous: boolean;
  readonly status?: number;
  readonly providerCode?: string;
  readonly inputRejected: boolean;

  constructor(
    message: string,
    retryable = false,
    dispatchAmbiguous = false,
    provider: AzureDiProviderFailure = {}
  ) {
    super(message);
    this.name = 'AzureDiError';
    this.retryable = retryable;
    this.dispatchAmbiguous = dispatchAmbiguous;
    this.status = provider.status;
    this.providerCode = provider.code;
    this.inputRejected = provider.inputRejected ?? false;
  }
}
