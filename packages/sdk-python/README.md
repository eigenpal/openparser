# openparser-sdk

Parse and extract structured data from documents with the OpenParser API.

Install the PyPI distribution `openparser-sdk`; import the client as `openparser`.

[Documentation](https://docs.openparser.dev) · [OpenParser](https://openparser.dev)

[![license](https://img.shields.io/badge/license-Apache--2.0-3B5BDB?labelColor=555)](./LICENSE)

## Install

```bash
pip install openparser-sdk
```

Use Python 3.10 or newer. Create an API key in the OpenParser dashboard.

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

Set `OPENPARSER_API_KEY` to create the client without constructor arguments.
Set `OPENPARSER_BASE_URL` to use a different API origin.

## Parse

The API holds synchronous requests for up to 300 seconds. It returns the result
when processing finishes or a durable job reference when the wait expires.

```python
# Sync: hold the connection until the result or timeout.
parsed = client.parse.sync(
    {"ocr_model": "paddleocr-vl-1.6"},
    file=Path("document.pdf"),
)

# Async: create a job and poll it later.
accepted = client.parse.async_(
    {"ocr_model": "paddleocr-vl-1.6"},
    file=Path("document.pdf"),
)
job = client.wait_for_job(accepted.id)

# Reuse a file-pool upload instead of inline bytes.
uploaded = client.files.upload(Path("document.pdf"))
parsed = client.parse.sync({"ocr_model": "paddleocr-vl-1.6", "file_id": uploaded.id})
```

The SDK adds an `Idempotency-Key` header to every parse and extract request. Pass
`idempotency_key=` when you need to control retries.

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

Each error exposes the API response through `error.envelope`: `code`, `message`,
`request_id`, and `retryable`.

## Development

After changing the OpenAPI specification, regenerate the client and run its
checks:

```bash
packages/sdk-python/scripts/codegen.sh
packages/sdk-python/scripts/check-codegen.sh
uv run --project packages/sdk-python pytest
```

## License

[Apache-2.0](./LICENSE)
