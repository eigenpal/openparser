"""Retry-After parsing, binary GET retries, and request retry policy coverage."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
from unittest.mock import patch

import httpx
import pytest
import respx

from openparser import (
    OpenParserClient,
    OpenParserServiceUnavailableError,
    OpenParserTimeoutError,
)
from openparser.client import _is_retryable_request, _parse_retry_after


@pytest.fixture
def retrying_client() -> OpenParserClient:
    return OpenParserClient(
        api_key="op_test_key",
        base_url="https://api.openparser.dev",
        max_retries=1,
    )


def test_parse_retry_after_rejects_malformed_and_negative() -> None:
    assert _parse_retry_after(None) is None
    assert _parse_retry_after("") is None
    assert _parse_retry_after("not-a-delay") is None
    assert _parse_retry_after("-1") is None
    assert _parse_retry_after("-0.5") is None
    assert _parse_retry_after("nan") is None
    assert _parse_retry_after("inf") is None


def test_parse_retry_after_accepts_nonnegative_delta_seconds() -> None:
    assert _parse_retry_after("0") == 0.0
    assert _parse_retry_after("12") == 12.0
    assert _parse_retry_after("1.5") == 1.5


def test_parse_retry_after_accepts_http_date() -> None:
    when = datetime.now(timezone.utc) + timedelta(seconds=8)
    delay = _parse_retry_after(format_datetime(when))
    assert delay is not None
    assert 7.0 <= delay <= 8.0


def test_is_retryable_request_policy() -> None:
    assert _is_retryable_request("GET") is True
    assert _is_retryable_request("HEAD") is True
    assert _is_retryable_request("get") is True
    assert _is_retryable_request("POST", {"Idempotency-Key": "idem-1"}) is True
    assert _is_retryable_request("POST") is False
    assert _is_retryable_request("PATCH") is False
    assert _is_retryable_request("DELETE") is False
    assert _is_retryable_request("PUT") is False
    assert _is_retryable_request("POST", {"Idempotency-Key": ""}) is False
    assert _is_retryable_request("POST", {"Idempotency-Key": "   "}) is False


@respx.mock
@patch("openparser.client.time.sleep")
def test_malformed_retry_after_falls_back_to_backoff(
    mock_sleep: object,
    retrying_client: OpenParserClient,
) -> None:
    respx.get("https://api.openparser.dev/models/ocr").mock(
        side_effect=[
            httpx.Response(503, headers={"retry-after": "not-a-delay"}),
            httpx.Response(200, json={"models": []}),
        ]
    )

    retrying_client.models.list_ocr()

    mock_sleep.assert_called_once_with(0.25)  # type: ignore[attr-defined]


@respx.mock
@patch("openparser.client.time.sleep")
def test_negative_retry_after_falls_back_to_backoff(
    mock_sleep: object,
    retrying_client: OpenParserClient,
) -> None:
    respx.get("https://api.openparser.dev/models/ocr").mock(
        side_effect=[
            httpx.Response(503, headers={"retry-after": "-3"}),
            httpx.Response(200, json={"models": []}),
        ]
    )

    retrying_client.models.list_ocr()

    mock_sleep.assert_called_once_with(0.25)  # type: ignore[attr-defined]


@respx.mock
@patch("openparser.client.time.sleep")
def test_http_date_retry_after_uses_delay_until_date(
    mock_sleep: object,
    retrying_client: OpenParserClient,
) -> None:
    when = datetime.now(timezone.utc) + timedelta(seconds=5)
    respx.get("https://api.openparser.dev/models/ocr").mock(
        side_effect=[
            httpx.Response(503, headers={"retry-after": format_datetime(when)}),
            httpx.Response(200, json={"models": []}),
        ]
    )

    retrying_client.models.list_ocr()

    mock_sleep.assert_called_once()  # type: ignore[attr-defined]
    delay = mock_sleep.call_args.args[0]  # type: ignore[attr-defined]
    assert 4.0 <= delay <= 5.0


@respx.mock
@patch("openparser.client.time.sleep")
def test_jobs_source_retries_on_503_and_returns_bytes(
    mock_sleep: object,
    retrying_client: OpenParserClient,
) -> None:
    respx.get("https://api.openparser.dev/jobs/opj_1/source").mock(
        side_effect=[
            httpx.Response(503, headers={"retry-after": "0"}),
            httpx.Response(
                200, content=b"%PDF-source", headers={"content-type": "application/pdf"}
            ),
        ]
    )

    assert retrying_client.jobs.source("opj_1") == b"%PDF-source"
    mock_sleep.assert_called_once_with(0.0)  # type: ignore[attr-defined]


@respx.mock
@patch("openparser.client.time.sleep")
def test_files_download_retries_on_503_and_returns_bytes(
    mock_sleep: object,
    retrying_client: OpenParserClient,
) -> None:
    respx.get("https://api.openparser.dev/files/file_1/content").mock(
        side_effect=[
            httpx.Response(503, headers={"retry-after": "0"}),
            httpx.Response(
                200, content=b"%PDF-file", headers={"content-type": "application/pdf"}
            ),
        ]
    )

    assert retrying_client.files.download("file_1") == b"%PDF-file"
    mock_sleep.assert_called_once_with(0.0)  # type: ignore[attr-defined]


@respx.mock
def test_binary_timeout_becomes_openparser_timeout_error() -> None:
    client = OpenParserClient(
        api_key="op_test_key",
        base_url="https://api.openparser.dev",
        max_retries=0,
    )
    respx.get("https://api.openparser.dev/jobs/opj_1/source").mock(
        side_effect=httpx.TimeoutException("timed out")
    )
    respx.get("https://api.openparser.dev/files/file_1/content").mock(
        side_effect=httpx.TimeoutException("timed out")
    )

    with pytest.raises(OpenParserTimeoutError):
        client.jobs.source("opj_1")
    with pytest.raises(OpenParserTimeoutError):
        client.files.download("file_1")


SERVICE_UNAVAILABLE = httpx.Response(
    503,
    json={
        "error": {
            "code": "service_unavailable",
            "message": "down",
            "request_id": "req_retry",
            "retryable": True,
        }
    },
)


@respx.mock
@patch("openparser.client.time.sleep")
def test_safe_get_retries_on_503(
    mock_sleep: object,
    retrying_client: OpenParserClient,
) -> None:
    route = respx.get("https://api.openparser.dev/models/ocr").mock(
        side_effect=[SERVICE_UNAVAILABLE, httpx.Response(200, json={"models": []})]
    )

    retrying_client.models.list_ocr()

    assert route.call_count == 2
    mock_sleep.assert_called_once()  # type: ignore[attr-defined]


@respx.mock
@patch("openparser.client.time.sleep")
def test_idempotency_keyed_parse_retries_on_503(
    mock_sleep: object,
    retrying_client: OpenParserClient,
) -> None:
    route = respx.post("https://api.openparser.dev/parse/async").mock(
        side_effect=[
            SERVICE_UNAVAILABLE,
            httpx.Response(
                202, json={"id": "opj_1", "operation": "parse", "status": "queued"}
            ),
        ]
    )

    retrying_client.parse.async_(
        {"ocr_model": "paddleocr-vl-1.6"},
        file={
            "content": b"%PDF",
            "filename": "doc.pdf",
            "mime_type": "application/pdf",
        },
        idempotency_key="idem-parse",
    )

    assert route.call_count == 2
    assert route.calls[0].request.headers["idempotency-key"] == "idem-parse"
    assert route.calls[1].request.headers["idempotency-key"] == "idem-parse"
    mock_sleep.assert_called_once()  # type: ignore[attr-defined]


@respx.mock
@patch("openparser.client.time.sleep")
def test_idempotency_keyed_parse_retries_on_transport_error(
    mock_sleep: object,
    retrying_client: OpenParserClient,
) -> None:
    route = respx.post("https://api.openparser.dev/parse/async").mock(
        side_effect=[
            httpx.ConnectError("connection reset"),
            httpx.Response(
                202, json={"id": "opj_1", "operation": "parse", "status": "queued"}
            ),
        ]
    )

    retrying_client.parse.async_(
        {"ocr_model": "paddleocr-vl-1.6"},
        file={
            "content": b"%PDF",
            "filename": "doc.pdf",
            "mime_type": "application/pdf",
        },
        idempotency_key="idem-parse-net",
    )

    assert route.call_count == 2
    mock_sleep.assert_called_once()  # type: ignore[attr-defined]


@respx.mock
@patch("openparser.client.time.sleep")
def test_unprotected_file_upload_does_not_retry_on_503(
    mock_sleep: object,
    retrying_client: OpenParserClient,
) -> None:
    route = respx.post("https://api.openparser.dev/files").mock(
        side_effect=[SERVICE_UNAVAILABLE, SERVICE_UNAVAILABLE]
    )

    with pytest.raises(OpenParserServiceUnavailableError):
        retrying_client.files.upload(
            {
                "content": b"%PDF",
                "filename": "doc.pdf",
                "mime_type": "application/pdf",
            }
        )

    assert route.call_count == 1
    mock_sleep.assert_not_called()  # type: ignore[attr-defined]


@respx.mock
@patch("openparser.client.time.sleep")
def test_unprotected_file_upload_does_not_retry_on_transport_error(
    mock_sleep: object,
    retrying_client: OpenParserClient,
) -> None:
    route = respx.post("https://api.openparser.dev/files").mock(
        side_effect=httpx.ConnectError("connection reset")
    )

    with pytest.raises(httpx.ConnectError):
        retrying_client.files.upload(
            {
                "content": b"%PDF",
                "filename": "doc.pdf",
                "mime_type": "application/pdf",
            }
        )

    assert route.call_count == 1
    mock_sleep.assert_not_called()  # type: ignore[attr-defined]


@respx.mock
@patch("openparser.client.time.sleep")
def test_unprotected_pipeline_create_does_not_retry_on_503(
    mock_sleep: object,
    retrying_client: OpenParserClient,
) -> None:
    route = respx.post("https://api.openparser.dev/pipelines").mock(
        side_effect=[SERVICE_UNAVAILABLE, SERVICE_UNAVAILABLE]
    )

    with pytest.raises(OpenParserServiceUnavailableError):
        retrying_client.pipelines.create(
            {"name": "demo", "schema": {"type": "object", "properties": {}}}
        )

    assert route.call_count == 1
    mock_sleep.assert_not_called()  # type: ignore[attr-defined]


@respx.mock
@patch("openparser.client.time.sleep")
def test_unprotected_pipeline_update_and_delete_do_not_retry(
    mock_sleep: object,
    retrying_client: OpenParserClient,
) -> None:
    update = respx.patch("https://api.openparser.dev/pipelines/pl_1").mock(
        side_effect=[SERVICE_UNAVAILABLE, SERVICE_UNAVAILABLE]
    )
    delete = respx.delete("https://api.openparser.dev/pipelines/pl_1").mock(
        side_effect=[SERVICE_UNAVAILABLE, SERVICE_UNAVAILABLE]
    )

    with pytest.raises(OpenParserServiceUnavailableError):
        retrying_client.pipelines.update("pl_1", {"name": "renamed"})
    with pytest.raises(OpenParserServiceUnavailableError):
        retrying_client.pipelines.delete("pl_1")

    assert update.call_count == 1
    assert delete.call_count == 1
    mock_sleep.assert_not_called()  # type: ignore[attr-defined]


@respx.mock
@patch("openparser.client.time.sleep")
def test_unprotected_suggest_schema_does_not_retry_on_503(
    mock_sleep: object,
    retrying_client: OpenParserClient,
) -> None:
    route = respx.post("https://api.openparser.dev/suggest-schema").mock(
        side_effect=[SERVICE_UNAVAILABLE, SERVICE_UNAVAILABLE]
    )

    with pytest.raises(OpenParserServiceUnavailableError):
        retrying_client.extract.suggest_schema({"document_text": "hello"})

    assert route.call_count == 1
    mock_sleep.assert_not_called()  # type: ignore[attr-defined]
