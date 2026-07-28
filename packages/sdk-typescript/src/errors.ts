import type { ErrorResponse } from './generated/types.gen';

/**
 * Base class for every error the SDK throws.
 */
export class OpenParserError extends Error {
  readonly status: number;
  readonly requestId?: string;
  readonly code?: string;
  readonly retryable?: boolean;
  readonly envelope?: ErrorResponse;

  constructor(message: string, opts: { status: number; envelope?: ErrorResponse }) {
    super(message);
    this.name = 'OpenParserError';
    this.status = opts.status;
    this.envelope = opts.envelope;
    this.requestId = opts.envelope?.error?.request_id;
    this.code = opts.envelope?.error?.code;
    this.retryable = opts.envelope?.error?.retryable;
  }
}

export class OpenParserAuthError extends OpenParserError {
  constructor(envelope?: ErrorResponse) {
    super(
      envelope?.error?.message ??
        'Invalid or missing API key. Pass `new OpenParserClient({ apiKey })` or set OPENPARSER_API_KEY.',
      { status: 401, envelope }
    );
    this.name = 'OpenParserAuthError';
  }
}

export class OpenParserForbiddenError extends OpenParserError {
  constructor(envelope?: ErrorResponse) {
    super(envelope?.error?.message ?? 'forbidden', { status: 403, envelope });
    this.name = 'OpenParserForbiddenError';
  }
}

export class OpenParserNotFoundError extends OpenParserError {
  constructor(envelope?: ErrorResponse) {
    super(envelope?.error?.message ?? 'not found', { status: 404, envelope });
    this.name = 'OpenParserNotFoundError';
  }
}

export class OpenParserValidationError extends OpenParserError {
  constructor(envelope?: ErrorResponse) {
    super(envelope?.error?.message ?? 'validation error', { status: 400, envelope });
    this.name = 'OpenParserValidationError';
  }
}

export class OpenParserPaymentRequiredError extends OpenParserError {
  constructor(envelope?: ErrorResponse) {
    super(envelope?.error?.message ?? 'insufficient credits', { status: 402, envelope });
    this.name = 'OpenParserPaymentRequiredError';
  }
}

export class OpenParserConflictError extends OpenParserError {
  constructor(envelope?: ErrorResponse) {
    super(envelope?.error?.message ?? 'conflict', { status: 409, envelope });
    this.name = 'OpenParserConflictError';
  }
}

export class OpenParserLimitExceededError extends OpenParserError {
  constructor(envelope?: ErrorResponse) {
    super(envelope?.error?.message ?? 'limit exceeded', { status: 413, envelope });
    this.name = 'OpenParserLimitExceededError';
  }
}

export class OpenParserUnsupportedMediaError extends OpenParserError {
  constructor(envelope?: ErrorResponse) {
    super(envelope?.error?.message ?? 'unsupported media type', { status: 415, envelope });
    this.name = 'OpenParserUnsupportedMediaError';
  }
}

export class OpenParserUnprocessableError extends OpenParserError {
  constructor(envelope?: ErrorResponse) {
    super(envelope?.error?.message ?? 'unprocessable', { status: 422, envelope });
    this.name = 'OpenParserUnprocessableError';
  }
}

export class OpenParserRateLimitError extends OpenParserError {
  readonly retryAfter?: number;

  constructor(envelope?: ErrorResponse, retryAfter?: number) {
    super(envelope?.error?.message ?? 'rate limit exceeded', { status: 429, envelope });
    this.name = 'OpenParserRateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class OpenParserServiceUnavailableError extends OpenParserError {
  readonly retryAfter?: number;

  constructor(envelope?: ErrorResponse, retryAfter?: number) {
    super(envelope?.error?.message ?? 'service unavailable', { status: 503, envelope });
    this.name = 'OpenParserServiceUnavailableError';
    this.retryAfter = retryAfter;
  }
}

export class OpenParserGatewayTimeoutError extends OpenParserError {
  constructor(envelope?: ErrorResponse) {
    super(envelope?.error?.message ?? 'sync wait observed an indeterminate job', {
      status: 504,
      envelope,
    });
    this.name = 'OpenParserGatewayTimeoutError';
  }
}

export class OpenParserServerError extends OpenParserError {
  constructor(status: number, envelope?: ErrorResponse) {
    super(envelope?.error?.message ?? 'internal server error', { status, envelope });
    this.name = 'OpenParserServerError';
  }
}

export class OpenParserTimeoutError extends OpenParserError {
  constructor(message = 'operation timed out') {
    super(message, { status: 0 });
    this.name = 'OpenParserTimeoutError';
  }
}

export function errorFromResponse(
  status: number,
  envelope: ErrorResponse | undefined,
  retryAfter?: number
): OpenParserError {
  if (status === 400) return new OpenParserValidationError(envelope);
  if (status === 401) return new OpenParserAuthError(envelope);
  if (status === 402) return new OpenParserPaymentRequiredError(envelope);
  if (status === 403) return new OpenParserForbiddenError(envelope);
  if (status === 404) return new OpenParserNotFoundError(envelope);
  if (status === 409) return new OpenParserConflictError(envelope);
  if (status === 413) return new OpenParserLimitExceededError(envelope);
  if (status === 415) return new OpenParserUnsupportedMediaError(envelope);
  if (status === 422) return new OpenParserUnprocessableError(envelope);
  if (status === 429) return new OpenParserRateLimitError(envelope, retryAfter);
  if (status === 503) return new OpenParserServiceUnavailableError(envelope, retryAfter);
  if (status === 504) return new OpenParserGatewayTimeoutError(envelope);
  if (status >= 500) return new OpenParserServerError(status, envelope);
  return new OpenParserError(envelope?.error?.message ?? `unexpected status ${status}`, {
    status,
    envelope,
  });
}

export function asErrorResponse(error: unknown): ErrorResponse | undefined {
  if (error && typeof error === 'object' && 'error' in error) {
    return error as ErrorResponse;
  }
  return undefined;
}
