"""Tests for multipart file uploads on parse and file pool routes."""

from __future__ import annotations

from pathlib import Path

import httpx
import pytest
import respx

from openparser import OpenParserClient


@pytest.fixture
def client() -> OpenParserClient:
    return OpenParserClient(api_key="op_test_key", base_url="https://api.openparser.dev", max_retries=0)


@respx.mock
def test_path_input_uploads_as_multipart(tmp_path: Path, client: OpenParserClient) -> None:
    pdf = tmp_path / "contract.pdf"
    pdf.write_bytes(b"%PDF-1.4 fake content")

    route = respx.post("https://api.openparser.dev/parse").mock(
        return_value=httpx.Response(200, json={"page_count": 1, "pages": []})
    )

    client.parse.sync({"ocr_model": "paddleocr-vl-1.6"}, file=pdf)

    request = route.calls.last.request
    assert request.headers["content-type"].startswith("multipart/form-data; boundary=")
    body = request.content.decode("utf-8", errors="replace")
    assert 'name="file"' in body
    assert 'filename="contract.pdf"' in body
    assert 'name="request"' in body


@respx.mock
def test_explicit_descriptor_with_raw_bytes(client: OpenParserClient) -> None:
    route = respx.post("https://api.openparser.dev/files").mock(
        return_value=httpx.Response(200, json={"id": "file_123", "filename": "contract.pdf"})
    )

    client.files.upload(
        {
            "content": b"%PDF",
            "filename": "contract.pdf",
            "mime_type": "application/pdf",
        }
    )

    body = route.calls.last.request.content.decode("utf-8", errors="replace")
    assert 'filename="contract.pdf"' in body
    assert "application/pdf" in body


@respx.mock
def test_file_like_object_uploads(tmp_path: Path, client: OpenParserClient) -> None:
    fpath = tmp_path / "policy.txt"
    fpath.write_bytes(b"hello world")

    route = respx.post("https://api.openparser.dev/parse/async").mock(
        return_value=httpx.Response(202, json={"id": "opj_1", "operation": "parse", "status": "queued"})
    )

    with fpath.open("rb") as handle:
        client.parse.async_(request={"ocr_model": "paddleocr-vl-1.6"}, file=handle)

    body = route.calls.last.request.content.decode("utf-8", errors="replace")
    assert 'filename="policy.txt"' in body


@respx.mock
def test_parse_batch_uploads_indexed_files(tmp_path: Path, client: OpenParserClient) -> None:
    a = tmp_path / "a.pdf"
    a.write_bytes(b"a")
    b = tmp_path / "b.pdf"
    b.write_bytes(b"b")

    route = respx.post("https://api.openparser.dev/parse/batch").mock(
        return_value=httpx.Response(202, json={"id": "opj_batch", "operation": "parse_batch", "status": "queued"})
    )

    client.parse.batch(
        {
            "ocr_model": "paddleocr-vl-1.6",
            "items": [
                {"file_index": 0},
                {"file_index": 1},
            ],
        },
        files=[a, b],
    )

    body = route.calls.last.request.content.decode("utf-8", errors="replace")
    assert body.count('name="files"') == 2
    assert 'filename="a.pdf"' in body
    assert 'filename="b.pdf"' in body
    assert route.calls.last.request.headers["idempotency-key"]
