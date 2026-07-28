"""Smoke tests for the OpenParser Python SDK against mocked API responses."""

from __future__ import annotations

import httpx
import pytest
import respx

from openparser import (
    OpenParserAuthError,
    OpenParserClient,
    OpenParserNotFoundError,
    OpenParserRateLimitError,
    OpenParserValidationError,
)


@pytest.fixture
def client() -> OpenParserClient:
    return OpenParserClient(api_key="op_test_key", base_url="https://api.openparser.dev", max_retries=0)


def job_terminal(**overrides: object) -> dict[str, object]:
    return {
        "id": "opj_123",
        "operation": "parse",
        "status": "succeeded",
        "result": {"page_count": 2},
        **overrides,
    }


@respx.mock
def test_attaches_bearer_auth_and_telemetry(client: OpenParserClient) -> None:
    route = respx.get("https://api.openparser.dev/models/ocr").mock(
        return_value=httpx.Response(200, json={"models": []})
    )

    client.models.list_ocr()

    headers = route.calls.last.request.headers
    assert headers["authorization"] == "Bearer op_test_key"
    assert headers["x-openparser-sdk"] == "python"
    assert headers["user-agent"].startswith("openparser-sdk-python/")


@respx.mock
def test_401_404_429_and_400_raise_typed_errors(client: OpenParserClient) -> None:
    respx.get("https://api.openparser.dev/pipelines").mock(
        side_effect=[
            httpx.Response(
                401,
                json={"error": {"code": "unauthorized", "message": "invalid", "request_id": "req_1", "retryable": False}},
            ),
            httpx.Response(
                429,
                headers={"retry-after": "12"},
                json={"error": {"code": "rate_limited", "message": "slow down", "request_id": "req_2", "retryable": True}},
            ),
            httpx.Response(
                400,
                json={"error": {"code": "bad_request", "message": "invalid", "request_id": "req_3", "retryable": False}},
            ),
        ]
    )
    respx.get("https://api.openparser.dev/pipelines/missing").mock(
        return_value=httpx.Response(
            404,
            json={"error": {"code": "not_found", "message": "missing", "request_id": "req_4", "retryable": False}},
        )
    )

    with pytest.raises(OpenParserAuthError):
        client.pipelines.list()
    with pytest.raises(OpenParserNotFoundError):
        client.pipelines.get("missing")
    with pytest.raises(OpenParserRateLimitError) as exc:
        client.pipelines.list()
    assert exc.value.retry_after == 12
    with pytest.raises(OpenParserValidationError):
        client.pipelines.list()


@respx.mock
def test_response_fields_take_precedence_over_dict_methods(client: OpenParserClient) -> None:
    respx.get("https://api.openparser.dev/pipelines").mock(
        return_value=httpx.Response(200, json={"items": [{"id": "oppl_123"}]})
    )

    response = client.pipelines.list()

    assert response.items[0].id == "oppl_123"
    assert dict.items(response)


@respx.mock
def test_wait_for_job_polls_until_terminal(client: OpenParserClient) -> None:
    respx.get("https://api.openparser.dev/jobs/opj_123").mock(
        side_effect=[
            httpx.Response(200, json=job_terminal(status="running")),
            httpx.Response(200, json=job_terminal(status="succeeded", result={"page_count": 3})),
        ]
    )

    result = client.wait_for_job("opj_123", poll_interval_seconds=0.01, timeout_seconds=5.0)

    assert result.status == "succeeded"
    assert result.result.page_count == 3
