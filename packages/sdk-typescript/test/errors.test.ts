import { describe, expect, test } from 'bun:test';
import {
  OpenParserAuthError,
  OpenParserConflictError,
  OpenParserError,
  OpenParserForbiddenError,
  OpenParserGatewayTimeoutError,
  OpenParserLimitExceededError,
  OpenParserNotFoundError,
  OpenParserPaymentRequiredError,
  OpenParserRateLimitError,
  OpenParserServerError,
  OpenParserServiceUnavailableError,
  OpenParserUnprocessableError,
  OpenParserUnsupportedMediaError,
  OpenParserValidationError,
} from '../src';
import { errorFromResponse } from '../src/errors';
import type { ErrorResponse } from '../src/generated/types.gen';

function envelope(
  code: string,
  message: string,
  opts?: { requestId?: string; retryable?: boolean }
): ErrorResponse {
  return {
    error: {
      code,
      message,
      request_id: opts?.requestId ?? 'req_test',
      retryable: opts?.retryable ?? false,
    },
  };
}

describe('errorFromResponse', () => {
  test('maps existing statuses to typed errors', () => {
    const validation = errorFromResponse(400, envelope('bad_request', 'validation error'));
    expect(validation).toBeInstanceOf(OpenParserValidationError);
    expect(validation.status).toBe(400);
    expect(validation.message).toBe('validation error');
    expect(validation.code).toBe('bad_request');

    const auth = errorFromResponse(401, envelope('unauthorized', 'invalid key'));
    expect(auth).toBeInstanceOf(OpenParserAuthError);
    expect(auth.status).toBe(401);

    const forbidden = errorFromResponse(403, envelope('forbidden', 'denied'));
    expect(forbidden).toBeInstanceOf(OpenParserForbiddenError);
    expect(forbidden.status).toBe(403);

    const notFound = errorFromResponse(404, envelope('not_found', 'missing'));
    expect(notFound).toBeInstanceOf(OpenParserNotFoundError);
    expect(notFound.status).toBe(404);

    const rateLimit = errorFromResponse(429, envelope('rate_limited', 'slow down'), 12);
    expect(rateLimit).toBeInstanceOf(OpenParserRateLimitError);
    expect(rateLimit.status).toBe(429);
    expect((rateLimit as OpenParserRateLimitError).retryAfter).toBe(12);

    const server = errorFromResponse(500, envelope('internal_error', 'boom'));
    expect(server).toBeInstanceOf(OpenParserServerError);
    expect(server.status).toBe(500);
    expect(server.message).toBe('boom');
  });

  test('maps newly handled statuses to typed errors', () => {
    const paymentRequired = errorFromResponse(
      402,
      envelope('insufficient_credits', 'out of credits')
    );
    expect(paymentRequired).toBeInstanceOf(OpenParserPaymentRequiredError);
    expect(paymentRequired.status).toBe(402);
    expect(paymentRequired.message).toBe('out of credits');

    const conflict = errorFromResponse(409, envelope('idempotency_conflict', 'conflict'));
    expect(conflict).toBeInstanceOf(OpenParserConflictError);
    expect(conflict.status).toBe(409);
    expect(conflict.message).toBe('conflict');

    const limitExceeded = errorFromResponse(413, envelope('payload_too_large', 'too big'));
    expect(limitExceeded).toBeInstanceOf(OpenParserLimitExceededError);
    expect(limitExceeded.status).toBe(413);
    expect(limitExceeded.message).toBe('too big');

    const unsupportedMedia = errorFromResponse(
      415,
      envelope('unsupported_media_type', 'bad content type')
    );
    expect(unsupportedMedia).toBeInstanceOf(OpenParserUnsupportedMediaError);
    expect(unsupportedMedia.status).toBe(415);
    expect(unsupportedMedia.message).toBe('bad content type');

    const unprocessable = errorFromResponse(422, envelope('job_not_terminal', 'job still running'));
    expect(unprocessable).toBeInstanceOf(OpenParserUnprocessableError);
    expect(unprocessable.status).toBe(422);
    expect(unprocessable.message).toBe('job still running');

    const serviceUnavailable = errorFromResponse(503, envelope('service_unavailable', 'down'), 30);
    expect(serviceUnavailable).toBeInstanceOf(OpenParserServiceUnavailableError);
    expect(serviceUnavailable.status).toBe(503);
    expect(serviceUnavailable.message).toBe('down');
    expect((serviceUnavailable as OpenParserServiceUnavailableError).retryAfter).toBe(30);

    const gatewayTimeout = errorFromResponse(
      504,
      envelope('gateway_timeout', 'sync wait observed an indeterminate job')
    );
    expect(gatewayTimeout).toBeInstanceOf(OpenParserGatewayTimeoutError);
    expect(gatewayTimeout.status).toBe(504);
    expect(gatewayTimeout.message).toBe('sync wait observed an indeterminate job');
  });

  test('uses default messages when envelope is missing', () => {
    expect(errorFromResponse(402, undefined).message).toBe('insufficient credits');
    expect(errorFromResponse(409, undefined).message).toBe('conflict');
    expect(errorFromResponse(413, undefined).message).toBe('limit exceeded');
    expect(errorFromResponse(415, undefined).message).toBe('unsupported media type');
    expect(errorFromResponse(422, undefined).message).toBe('unprocessable');
    expect(errorFromResponse(503, undefined).message).toBe('service unavailable');
    expect(errorFromResponse(504, undefined).message).toBe(
      'sync wait observed an indeterminate job'
    );
    expect(errorFromResponse(400, undefined).message).toBe('validation error');
    expect(errorFromResponse(401, undefined).message).toMatch(/API key/);
    expect(errorFromResponse(404, undefined).message).toBe('not found');
    expect(errorFromResponse(429, undefined).message).toBe('rate limit exceeded');
    expect(errorFromResponse(500, undefined).message).toBe('internal server error');
  });

  test('falls back to generic OpenParserError for unmapped statuses', () => {
    const err = errorFromResponse(418, envelope('teapot', "I'm a teapot"));
    expect(err).toBeInstanceOf(OpenParserError);
    expect(err).not.toBeInstanceOf(OpenParserValidationError);
    expect(err.status).toBe(418);
    expect(err.message).toBe("I'm a teapot");
  });

  test('attaches envelope metadata on typed errors', () => {
    const body = envelope('idempotency_conflict', 'conflict', {
      requestId: 'req_409',
      retryable: false,
    });
    const err = errorFromResponse(409, body);
    expect(err.envelope).toEqual(body);
    expect(err.requestId).toBe('req_409');
    expect(err.code).toBe('idempotency_conflict');
    expect(err.retryable).toBe(false);
  });
});
