# openparser-sdk

Parse and extract structured data from documents with the OpenParser API.

Install the PyPI distribution `openparser-sdk`; import the client as `openparser`.

[![license](https://img.shields.io/badge/license-Apache--2.0-3B5BDB?labelColor=555)](./LICENSE)

## Install

```bash
pip install openparser-sdk
```

Requires Python 3.10+. Get an API key from your OpenParser dashboard.

## Quick Start

```python
import os
from pathlib import Path
from openparser import OpenParserClient

client = OpenParserClient(api_key=os.environ["OPENPARSER_API_KEY"])

result = client.parse.sync(
    {"ocr_model": "paddleocr-vl-1.6", "output_format": "openparser@1"},
    file=Path("invoice.pdf"),
)

print(result.page_count)
```

Set `OPENPARSER_API_KEY` and optionally `OPENPARSER_BASE_URL` (default `https://api.openparser.dev`) instead of passing constructor arguments.

## Parse

Sync endpoints wait up to the server sync limit (typically 300 seconds) and return the terminal parse result when ready. If the wait expires first, the API returns `202` with a durable job reference.

```python
# Sync — server holds the connection until ready or timeout.
parsed = client.parse.sync(
    {"ocr_model": "paddleocr-vl-1.6"},
    file=Path("document.pdf"),
)

# Async — admit immediately and poll later.
accepted = client.parse.async_(
    {"ocr_model": "paddleocr-vl-1.6"},
    file=Path("document.pdf"),
)
job = client.wait_for_job(accepted.id)

# Reuse a file-pool upload instead of inline bytes.
uploaded = client.files.upload(Path("document.pdf"))
parsed = client.parse.sync({"ocr_model": "paddleocr-vl-1.6", "file_id": uploaded.id})
```

Every parse or extract `POST` sends an `Idempotency-Key` header. The SDK generates one automatically; pass `idempotency_key=` to control retries.

## Jobs

```python
jobs = client.jobs.list(status="succeeded", limit=25)
job = client.jobs.get("opj_...")
parse_result = client.jobs.result("opj_...", format="openparser@1")
source_bytes = client.jobs.source("opj_...")
```

## Files

```python
uploaded = client.files.upload(Path("contract.pdf"))
metadata = client.files.get(uploaded.id)
content = client.files.download(uploaded.id)
client.files.delete(uploaded.id)
```

Uploads accept `pathlib.Path`, a file handle, or `{"content": bytes, "filename": str, "mime_type": str?}`.

## Models

```python
ocr_models = client.models.list_ocr()
llm_models = client.models.list_llm(mode="search", q="claude")
```

## Pipelines

```python
pipeline = client.pipelines.create(
    {
        "name": "invoice-extract",
        "ocr_model": "paddleocr-vl-1.6",
        "llm_model": "anthropic/claude-sonnet-4",
        "schema": {
            "type": "object",
            "properties": {"vendor": {"type": "string"}},
            "required": ["vendor"],
        },
    }
)

listed = client.pipelines.list()
current = client.pipelines.get(pipeline.id)
updated = client.pipelines.update(pipeline.id, {"name": "invoice-v2"})
client.pipelines.delete(pipeline.id)
```

## Errors

Every non-2xx response raises a typed subclass of `OpenParserError`:

| HTTP | Class                               |
| ---- | ----------------------------------- |
| 400  | `OpenParserValidationError`         |
| 401  | `OpenParserAuthError`               |
| 402  | `OpenParserPaymentRequiredError`    |
| 403  | `OpenParserForbiddenError`          |
| 404  | `OpenParserNotFoundError`           |
| 409  | `OpenParserConflictError`           |
| 413  | `OpenParserLimitExceededError`      |
| 415  | `OpenParserUnsupportedMediaError`   |
| 422  | `OpenParserUnprocessableError`      |
| 429  | `OpenParserRateLimitError`          |
| 503  | `OpenParserServiceUnavailableError` |
| 504  | `OpenParserGatewayTimeoutError`     |
| 5xx  | `OpenParserServerError`             |

The original API error body is preserved on `error.envelope` (`code`, `message`, `request_id`, `retryable`).

## Development

Regenerate the committed OpenAPI client after spec changes:

```bash
packages/sdk-python/scripts/codegen.sh
packages/sdk-python/scripts/check-codegen.sh
uv run --project packages/sdk-python pytest
```

## License

Apache-2.0
