"""Typed exceptions raised by the OpenParser SDK."""

from __future__ import annotations

from typing import Any, Optional


class OpenParserError(Exception):
    """Base class for every error the SDK raises."""

    def __init__(
        self,
        message: str,
        *,
        status: int,
        envelope: Optional[dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.envelope = envelope
        self.request_id: Optional[str] = (envelope or {}).get("request_id")
        self.code: Optional[str] = (envelope or {}).get("code")
        self.retryable: Optional[bool] = (envelope or {}).get("retryable")


class OpenParserAuthError(OpenParserError):
    def __init__(self, envelope: Optional[dict[str, Any]] = None) -> None:
        msg = _error_message(envelope) or (
            "Invalid or missing API key. Pass OpenParserClient(api_key=...) "
            "or set OPENPARSER_API_KEY."
        )
        super().__init__(msg, status=401, envelope=envelope)


class OpenParserForbiddenError(OpenParserError):
    def __init__(self, envelope: Optional[dict[str, Any]] = None) -> None:
        msg = _error_message(envelope) or "forbidden"
        super().__init__(msg, status=403, envelope=envelope)


class OpenParserNotFoundError(OpenParserError):
    def __init__(self, envelope: Optional[dict[str, Any]] = None) -> None:
        msg = _error_message(envelope) or "not found"
        super().__init__(msg, status=404, envelope=envelope)


class OpenParserValidationError(OpenParserError):
    def __init__(self, envelope: Optional[dict[str, Any]] = None) -> None:
        msg = _error_message(envelope) or "validation error"
        super().__init__(msg, status=400, envelope=envelope)


class OpenParserPaymentRequiredError(OpenParserError):
    def __init__(self, envelope: Optional[dict[str, Any]] = None) -> None:
        msg = _error_message(envelope) or "insufficient credits"
        super().__init__(msg, status=402, envelope=envelope)


class OpenParserConflictError(OpenParserError):
    def __init__(self, envelope: Optional[dict[str, Any]] = None) -> None:
        msg = _error_message(envelope) or "conflict"
        super().__init__(msg, status=409, envelope=envelope)


class OpenParserLimitExceededError(OpenParserError):
    def __init__(self, envelope: Optional[dict[str, Any]] = None) -> None:
        msg = _error_message(envelope) or "limit exceeded"
        super().__init__(msg, status=413, envelope=envelope)


class OpenParserUnsupportedMediaError(OpenParserError):
    def __init__(self, envelope: Optional[dict[str, Any]] = None) -> None:
        msg = _error_message(envelope) or "unsupported media type"
        super().__init__(msg, status=415, envelope=envelope)


class OpenParserUnprocessableError(OpenParserError):
    def __init__(self, envelope: Optional[dict[str, Any]] = None) -> None:
        msg = _error_message(envelope) or "unprocessable"
        super().__init__(msg, status=422, envelope=envelope)


class OpenParserRateLimitError(OpenParserError):
    def __init__(
        self,
        envelope: Optional[dict[str, Any]] = None,
        retry_after: Optional[int] = None,
    ) -> None:
        super().__init__(_error_message(envelope) or "rate limit exceeded", status=429, envelope=envelope)
        self.retry_after = retry_after


class OpenParserServiceUnavailableError(OpenParserError):
    def __init__(
        self,
        envelope: Optional[dict[str, Any]] = None,
        retry_after: Optional[int] = None,
    ) -> None:
        super().__init__(
            _error_message(envelope) or "service unavailable",
            status=503,
            envelope=envelope,
        )
        self.retry_after = retry_after


class OpenParserGatewayTimeoutError(OpenParserError):
    def __init__(self, envelope: Optional[dict[str, Any]] = None) -> None:
        msg = _error_message(envelope) or "sync wait observed an indeterminate job"
        super().__init__(msg, status=504, envelope=envelope)


class OpenParserServerError(OpenParserError):
    def __init__(self, status: int, envelope: Optional[dict[str, Any]] = None) -> None:
        msg = _error_message(envelope) or "internal server error"
        super().__init__(msg, status=status, envelope=envelope)


class OpenParserTimeoutError(OpenParserError):
    def __init__(self, message: str = "operation timed out") -> None:
        super().__init__(message, status=0)


def _error_message(envelope: Optional[dict[str, Any]]) -> Optional[str]:
    if not envelope:
        return None
    message = envelope.get("message")
    return message if isinstance(message, str) else None


def _normalize_error_body(payload: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if not payload:
        return None
    error = payload.get("error")
    if isinstance(error, dict):
        return error
    return payload


def error_from_response(
    status: int,
    payload: Optional[dict[str, Any]],
    retry_after: Optional[int] = None,
) -> OpenParserError:
    envelope = _normalize_error_body(payload)
    if status == 400:
        return OpenParserValidationError(envelope)
    if status == 401:
        return OpenParserAuthError(envelope)
    if status == 402:
        return OpenParserPaymentRequiredError(envelope)
    if status == 403:
        return OpenParserForbiddenError(envelope)
    if status == 404:
        return OpenParserNotFoundError(envelope)
    if status == 409:
        return OpenParserConflictError(envelope)
    if status == 413:
        return OpenParserLimitExceededError(envelope)
    if status == 415:
        return OpenParserUnsupportedMediaError(envelope)
    if status == 422:
        return OpenParserUnprocessableError(envelope)
    if status == 429:
        return OpenParserRateLimitError(envelope, retry_after)
    if status == 503:
        return OpenParserServiceUnavailableError(envelope, retry_after)
    if status == 504:
        return OpenParserGatewayTimeoutError(envelope)
    if status >= 500:
        return OpenParserServerError(status, envelope)
    return OpenParserError(f"unexpected status {status}", status=status, envelope=envelope)
