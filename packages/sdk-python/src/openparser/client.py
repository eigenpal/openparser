"""Hand-written Python facade for the OpenParser API."""

from __future__ import annotations

import json
import math
import os
import time
import uuid
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, BinaryIO, Literal, Optional, Sequence, Union

import httpx

from openparser._files import to_upload_tuple
from openparser._generated.client import Client as GeneratedClient
from openparser._generated.api.extract import (
    extract_async,
    extract_batch,
    extract_sync,
    suggest_schema,
)
from openparser._generated.api.files import (
    create_file,
    delete_file,
    get_file,
    get_file_content,
)
from openparser._generated.api.jobs import (
    complete_extraction_review,
    get_extraction_review,
    get_job,
    get_job_result,
    get_job_source,
    list_jobs,
    reopen_extraction_review,
    update_extraction_review,
)
from openparser._generated.api.models import list_llm_models, list_ocr_models
from openparser._generated.api.parse import parse_async, parse_batch, parse_sync
from openparser._generated.api.pipelines import (
    create_extraction_pipeline,
    delete_extraction_pipeline,
    get_extraction_pipeline,
    list_extraction_pipelines,
    update_extraction_pipeline,
)
from openparser._generated_requests import (
    RawBody,
    optional,
    optional_wire,
    Wire,
)
from openparser._telemetry import build_telemetry_headers
from openparser.errors import (
    OpenParserError,
    OpenParserTimeoutError,
    error_from_response,
)

DEFAULT_BASE_URL = "https://api.openparser.dev"
DEFAULT_TIMEOUT_SECONDS = 300.0
DEFAULT_POLL_INTERVAL_SECONDS = 2.0
DEFAULT_WAIT_TIMEOUT_SECONDS = 300.0
TERMINAL_JOB_STATUSES = frozenset({"succeeded", "failed", "indeterminate"})

FileInput = Union[Path, dict[str, Any], BinaryIO]
ParseResultFormat = Literal["openparser@1", "raw"]
LlmModelsMode = Literal["suggested", "search"]


class AttrDict(dict[str, Any]):
    def __getattribute__(self, name: str) -> Any:
        if not name.startswith("__"):
            try:
                return dict.__getitem__(self, name)
            except KeyError:
                pass
        try:
            return dict.__getattribute__(self, name)
        except AttributeError:
            raise AttributeError(name) from None


def _to_attr(value: Any) -> Any:
    if isinstance(value, dict):
        return AttrDict({key: _to_attr(item) for key, item in value.items()})
    if isinstance(value, list):
        return [_to_attr(item) for item in value]
    return value


def _headers(api_key: str, default_headers: Optional[dict[str, str]]) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        **build_telemetry_headers(),
        **(default_headers or {}),
    }


def _idempotency_key(value: Optional[str]) -> str:
    return value or str(uuid.uuid4())


def _assert_json_response(response: httpx.Response) -> None:
    if response.status_code == 204:
        return
    content_type = (response.headers.get("content-type") or "").lower()
    if content_type == "" or "json" in content_type or "octet-stream" in content_type:
        return
    raise OpenParserError(
        f'Expected a JSON response from the API but got Content-Type "{content_type}". '
        'Set `base_url` to your OpenParser API root, e.g. "https://api.openparser.dev".',
        status=response.status_code,
    )


def _parse_json_error(response: httpx.Response) -> Optional[dict[str, Any]]:
    try:
        parsed = response.json()
    except Exception:
        return None
    return parsed if isinstance(parsed, dict) else None


def _backoff(attempt: int) -> float:
    return 0.25 * (2**attempt)


def _parse_retry_after(value: Optional[str]) -> Optional[float]:
    """Parse Retry-After as nonnegative delta-seconds or HTTP-date.

    Returns delay seconds, or None when the header is missing/malformed/negative
    so callers can fall back to exponential backoff.
    """
    if not value:
        return None

    try:
        seconds = float(value)
    except ValueError:
        seconds = None
    else:
        if math.isfinite(seconds) and seconds >= 0:
            return seconds
        return None

    try:
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError, IndexError, OverflowError):
        return None
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    return max(0.0, (when - datetime.now(timezone.utc)).total_seconds())


def _retry_delay(response: httpx.Response, attempt: int) -> float:
    parsed = _parse_retry_after(response.headers.get("retry-after"))
    return parsed if parsed is not None else _backoff(attempt)


def _check_response(response: httpx.Response) -> Any:
    _assert_json_response(response)
    if 200 <= response.status_code < 300:
        if response.status_code == 204 or not response.content:
            return None
        return _to_attr(response.json())

    parsed = _parse_retry_after(response.headers.get("retry-after"))
    retry_after = int(parsed) if parsed is not None else None
    raise error_from_response(
        response.status_code, _parse_json_error(response), retry_after
    )


def _is_retriable(status: int) -> bool:
    return status >= 500 or status == 429


SAFE_HTTP_METHODS = frozenset({"GET", "HEAD"})


def _header_value(headers: Any, name: str) -> Optional[str]:
    if headers is None:
        return None
    target = name.lower()
    if isinstance(headers, dict):
        for key, value in headers.items():
            if str(key).lower() == target and value is not None:
                return value if isinstance(value, str) else str(value)
        return None
    try:
        value = headers.get(name)
    except Exception:
        return None
    if value is None:
        return None
    return value if isinstance(value, str) else str(value)


def _is_retryable_request(method: str, headers: Any = None) -> bool:
    """Whether an ambiguous failure may be retried for this request.

    Safe reads (GET/HEAD) always retry. Mutations retry only when an
    Idempotency-Key is present so the server can dedupe (parse/extract
    admission). Unprotected mutations fail fast to avoid duplicate writes.
    """
    if method.upper() in SAFE_HTTP_METHODS:
        return True
    key = _header_value(headers, "Idempotency-Key")
    return bool(key and key.strip())


class OpenParserClient:
    """Top-level OpenParser API client."""

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
        max_retries: int = 3,
        default_headers: Optional[dict[str, str]] = None,
        httpx_args: Optional[dict[str, Any]] = None,
    ) -> None:
        resolved_key = api_key or os.getenv("OPENPARSER_API_KEY")
        if not resolved_key:
            raise OpenParserError(
                "Missing API key. Pass `OpenParserClient(api_key=...)` or set OPENPARSER_API_KEY.",
                status=0,
            )

        self.base_url = (
            base_url or os.getenv("OPENPARSER_BASE_URL") or DEFAULT_BASE_URL
        ).rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        # The generated client owns the httpx.Client. Retries stay in `_send`, so
        # they apply the same way to every endpoint and keep httpx_args (TLS, proxies).
        self._generated = GeneratedClient(base_url=self.base_url)
        self._generated.set_httpx_client(
            httpx.Client(
                base_url=self.base_url,
                timeout=timeout_seconds,
                headers=_headers(resolved_key, default_headers),
                **(httpx_args or {}),
            )
        )

        self.parse = ParseResource(self)
        self.extract = ExtractResource(self)
        self.jobs = JobsResource(self)
        self.files = FilesResource(self)
        self.models = ModelsResource(self)
        self.pipelines = PipelinesResource(self)

    def close(self) -> None:
        self._generated.get_httpx_client().close()

    def __enter__(self) -> "OpenParserClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def _send(self, kwargs: dict[str, Any]) -> httpx.Response:
        """Send a request built by a generated builder, retrying where the policy allows."""
        http = self._generated.get_httpx_client()
        may_retry = _is_retryable_request(kwargs["method"], kwargs.get("headers"))
        for attempt in range(self.max_retries + 1):
            try:
                response = http.request(**kwargs)
                if (
                    may_retry
                    and _is_retriable(response.status_code)
                    and attempt < self.max_retries
                ):
                    time.sleep(_retry_delay(response, attempt))
                    continue
                return response
            except httpx.TimeoutException as exc:
                if may_retry and attempt < self.max_retries:
                    time.sleep(_backoff(attempt))
                    continue
                raise OpenParserTimeoutError() from exc
            except httpx.TransportError:
                if may_retry and attempt < self.max_retries:
                    time.sleep(_backoff(attempt))
                    continue
                raise

        raise AssertionError("unreachable")

    def _request(self, kwargs: dict[str, Any]) -> Any:
        return _check_response(self._send(kwargs))

    def _request_bytes(self, kwargs: dict[str, Any]) -> bytes:
        response = self._send(kwargs)
        if response.status_code >= 400:
            _check_response(response)
        return response.content

    def wait_for_job(
        self,
        job_id: str,
        *,
        timeout_seconds: float = DEFAULT_WAIT_TIMEOUT_SECONDS,
        poll_interval_seconds: float = DEFAULT_POLL_INTERVAL_SECONDS,
    ) -> Any:
        deadline = time.monotonic() + timeout_seconds
        while time.monotonic() < deadline:
            job = self.jobs.get(job_id)
            status = (
                job.get("status")
                if isinstance(job, dict)
                else getattr(job, "status", None)
            )
            if status in TERMINAL_JOB_STATUSES:
                return job
            time.sleep(poll_interval_seconds)
        raise OpenParserTimeoutError(
            f"Job {job_id} did not finish within {timeout_seconds:g}s"
        )


def _multipart_submit(
    root: OpenParserClient,
    builder: Any,
    parts: list[tuple[str, Any]],
    idempotency_key: Optional[str],
) -> Any:
    kwargs = builder._get_kwargs(
        body=RawBody(multipart=parts),
        idempotency_key=_idempotency_key(idempotency_key),
    )
    return root._request(kwargs)


def _request_parts(request: dict[str, Any]) -> list[tuple[str, Any]]:
    return [("request", (None, json.dumps(request), "application/json"))]


class ParseResource:
    def __init__(self, root: OpenParserClient) -> None:
        self._root = root

    def sync(
        self,
        request: dict[str, Any],
        *,
        file: Optional[FileInput] = None,
        idempotency_key: Optional[str] = None,
    ) -> Any:
        return self._submit(parse_sync, request, file=file, idempotency_key=idempotency_key)

    def async_(
        self,
        request: dict[str, Any],
        *,
        file: Optional[FileInput] = None,
        idempotency_key: Optional[str] = None,
    ) -> Any:
        return self._submit(parse_async, request, file=file, idempotency_key=idempotency_key)

    def batch(
        self,
        request: dict[str, Any],
        *,
        files: Sequence[FileInput],
        idempotency_key: Optional[str] = None,
    ) -> Any:
        parts = _request_parts(request)
        parts.extend(("files", to_upload_tuple(item)) for item in files)
        return _multipart_submit(self._root, parse_batch, parts, idempotency_key)

    def _submit(
        self,
        builder: Any,
        request: dict[str, Any],
        *,
        file: Optional[FileInput],
        idempotency_key: Optional[str],
    ) -> Any:
        parts = _request_parts(request)
        if file is not None:
            parts.append(("file", to_upload_tuple(file)))
        return _multipart_submit(self._root, builder, parts, idempotency_key)


class ExtractResource:
    def __init__(self, root: OpenParserClient) -> None:
        self._root = root

    def sync(
        self,
        request: dict[str, Any],
        *,
        file: Optional[FileInput] = None,
        idempotency_key: Optional[str] = None,
    ) -> Any:
        return self._submit(extract_sync, request, file=file, idempotency_key=idempotency_key)

    def async_(
        self,
        request: dict[str, Any],
        *,
        file: Optional[FileInput] = None,
        idempotency_key: Optional[str] = None,
    ) -> Any:
        return self._submit(extract_async, request, file=file, idempotency_key=idempotency_key)

    def batch(
        self,
        request: dict[str, Any],
        *,
        files: Sequence[FileInput],
        idempotency_key: Optional[str] = None,
    ) -> Any:
        parts = _request_parts(request)
        parts.extend(("files", to_upload_tuple(item)) for item in files)
        return _multipart_submit(self._root, extract_batch, parts, idempotency_key)

    def suggest_schema(self, body: dict[str, Any]) -> Any:
        kwargs = suggest_schema._get_kwargs(body=RawBody(json=body))
        return self._root._request(kwargs)

    def _submit(
        self,
        builder: Any,
        request: dict[str, Any],
        *,
        file: Optional[FileInput],
        idempotency_key: Optional[str],
    ) -> Any:
        parts = _request_parts(request)
        if file is not None:
            parts.append(("file", to_upload_tuple(file)))
        return _multipart_submit(self._root, builder, parts, idempotency_key)


class JobsResource:
    def __init__(self, root: OpenParserClient) -> None:
        self._root = root

    def list(
        self,
        *,
        cursor: Optional[str] = None,
        limit: Optional[int] = None,
        status: Optional[str] = None,
        operation: Optional[str] = None,
    ) -> Any:
        kwargs = list_jobs._get_kwargs(
            cursor=optional(cursor),
            limit=optional(limit),
            status=optional_wire(status),
            operation=optional_wire(operation),
        )
        return self._root._request(kwargs)

    def get(
        self,
        job_id: str,
        *,
        cursor: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> Any:
        kwargs = get_job._get_kwargs(
            job_id, cursor=optional(cursor), limit=optional(limit)
        )
        return self._root._request(kwargs)

    def result(
        self,
        job_id: str,
        *,
        format: Optional[ParseResultFormat] = None,
    ) -> Any:
        kwargs = get_job_result._get_kwargs(job_id, format_=optional_wire(format))
        return self._root._request(kwargs)

    def source(self, job_id: str) -> bytes:
        return self._root._request_bytes(get_job_source._get_kwargs(job_id))

    def review(self, job_id: str) -> Any:
        return self._root._request(get_extraction_review._get_kwargs(job_id))

    def update_review(self, job_id: str, body: dict[str, Any]) -> Any:
        kwargs = update_extraction_review._get_kwargs(job_id, body=RawBody(json=body))
        return self._root._request(kwargs)

    def complete_review(self, job_id: str, body: dict[str, Any]) -> Any:
        kwargs = complete_extraction_review._get_kwargs(job_id, body=RawBody(json=body))
        return self._root._request(kwargs)

    def reopen_review(self, job_id: str, body: dict[str, Any]) -> Any:
        kwargs = reopen_extraction_review._get_kwargs(job_id, body=RawBody(json=body))
        return self._root._request(kwargs)


class FilesResource:
    def __init__(self, root: OpenParserClient) -> None:
        self._root = root

    def upload(self, file: FileInput) -> Any:
        kwargs = create_file._get_kwargs(
            body=RawBody(multipart=[("file", to_upload_tuple(file))])
        )
        return self._root._request(kwargs)

    def get(self, file_id: str) -> Any:
        return self._root._request(get_file._get_kwargs(file_id))

    def download(self, file_id: str) -> bytes:
        return self._root._request_bytes(get_file_content._get_kwargs(file_id))

    def delete(self, file_id: str) -> Any:
        return self._root._request(delete_file._get_kwargs(file_id))


class ModelsResource:
    def __init__(self, root: OpenParserClient) -> None:
        self._root = root

    def list_ocr(self) -> Any:
        return self._root._request(list_ocr_models._get_kwargs())

    def list_llm(
        self,
        *,
        mode: LlmModelsMode = "suggested",
        q: Optional[str] = None,
        page: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> Any:
        kwargs = list_llm_models._get_kwargs(
            mode=Wire(mode),
            q=optional(q),
            page=optional(page),
            limit=optional(limit),
        )
        return self._root._request(kwargs)


class PipelinesResource:
    def __init__(self, root: OpenParserClient) -> None:
        self._root = root

    def list(self) -> Any:
        return self._root._request(list_extraction_pipelines._get_kwargs())

    def get(self, pipeline_id: str) -> Any:
        return self._root._request(get_extraction_pipeline._get_kwargs(pipeline_id))

    def create(self, body: dict[str, Any]) -> Any:
        kwargs = create_extraction_pipeline._get_kwargs(body=RawBody(json=body))
        return self._root._request(kwargs)

    def update(self, pipeline_id: str, body: dict[str, Any]) -> Any:
        kwargs = update_extraction_pipeline._get_kwargs(
            pipeline_id, body=RawBody(json=body)
        )
        return self._root._request(kwargs)

    def delete(self, pipeline_id: str) -> Any:
        return self._root._request(delete_extraction_pipeline._get_kwargs(pipeline_id))
