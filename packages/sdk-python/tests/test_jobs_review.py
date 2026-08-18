"""Tests for extraction review facade methods."""

from __future__ import annotations

import json

import httpx
import pytest
import respx

from openparser import OpenParserClient


@pytest.fixture
def client() -> OpenParserClient:
    return OpenParserClient(api_key="op_test_key", base_url="https://api.openparser.dev", max_retries=0)


def review_payload(**overrides: object) -> dict[str, object]:
    return {
        "job_id": "opj_123",
        "status": "pending",
        "machine_output": {"total": 100},
        "corrected_output": {"total": 100},
        "version": 0,
        "events": [],
        "created_at": None,
        "updated_at": None,
        "completed_at": None,
        "reviewed_by_actor_id": None,
        "viewer_actor_id": "key_test",
        **overrides,
    }


@respx.mock
def test_jobs_review_endpoints(client: OpenParserClient) -> None:
    get_route = respx.get("https://api.openparser.dev/jobs/opj_123/review").mock(
        return_value=httpx.Response(200, json=review_payload())
    )
    patch_route = respx.patch("https://api.openparser.dev/jobs/opj_123/review").mock(
        return_value=httpx.Response(200, json=review_payload(version=1, corrected_output={"total": 120}))
    )
    complete_route = respx.post("https://api.openparser.dev/jobs/opj_123/review/complete").mock(
        return_value=httpx.Response(200, json=review_payload(status="approved", version=2))
    )
    reopen_route = respx.post("https://api.openparser.dev/jobs/opj_123/review/reopen").mock(
        return_value=httpx.Response(200, json=review_payload(status="pending", version=3))
    )

    client.jobs.review("opj_123")
    client.jobs.update_review(
        "opj_123",
        {
            "expected_version": 0,
            "confirmations": [{"path": "total", "value": 120}],
            "retractions": [{"path": "currency"}],
        },
    )
    client.jobs.complete_review(
        "opj_123",
        {
            "expected_version": 1,
            "status": "approved",
        },
    )
    client.jobs.reopen_review(
        "opj_123",
        {
            "expected_version": 2,
        },
    )

    assert get_route.call_count == 1
    assert patch_route.call_count == 1
    assert complete_route.call_count == 1
    assert reopen_route.call_count == 1

    assert json.loads(patch_route.calls.last.request.content) == {
        "expected_version": 0,
        "confirmations": [{"path": "total", "value": 120}],
        "retractions": [{"path": "currency"}],
    }
    assert json.loads(complete_route.calls.last.request.content) == {
        "expected_version": 1,
        "status": "approved",
    }
    assert json.loads(reopen_route.calls.last.request.content) == {
        "expected_version": 2,
    }
