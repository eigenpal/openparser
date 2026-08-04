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

/**
 * Transport / request validation errors from the Azure Document Intelligence HTTP client.
 */
export class AzureDiError extends Error {
  readonly retryable: boolean;
  readonly dispatchAmbiguous: boolean;

  constructor(message: string, retryable = false, dispatchAmbiguous = false) {
    super(message);
    this.name = 'AzureDiError';
    this.retryable = retryable;
    this.dispatchAmbiguous = dispatchAmbiguous;
  }
}
