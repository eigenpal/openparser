from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error_response import ErrorResponse
from ...models.job_accepted import JobAccepted
from ...models.parse_sync_body import ParseSyncBody
from ...models.parsed_document import ParsedDocument
from ...models.raw_parse_result import RawParseResult
from typing import cast



def _get_kwargs(
    *,
    body: ParseSyncBody,
    idempotency_key: str,

) -> dict[str, Any]:
    headers: dict[str, Any] = {}
    headers["Idempotency-Key"] = idempotency_key







    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/parse",
    }

    _kwargs["files"] = body.to_multipart()



    _kwargs["headers"] = headers
    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> ErrorResponse | JobAccepted | ParsedDocument | RawParseResult | None:
    if response.status_code == 200:
        def _parse_response_200(data: object) -> ParsedDocument | RawParseResult:
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_parse_result_type_0 = ParsedDocument.from_dict(data)



                return componentsschemas_parse_result_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            if not isinstance(data, dict):
                raise TypeError()
            componentsschemas_parse_result_type_1 = RawParseResult.from_dict(data)



            return componentsschemas_parse_result_type_1

        response_200 = _parse_response_200(response.json())

        return response_200

    if response.status_code == 202:
        response_202 = JobAccepted.from_dict(response.json())



        return response_202

    if response.status_code == 400:
        response_400 = ErrorResponse.from_dict(response.json())



        return response_400

    if response.status_code == 401:
        response_401 = ErrorResponse.from_dict(response.json())



        return response_401

    if response.status_code == 402:
        response_402 = ErrorResponse.from_dict(response.json())



        return response_402

    if response.status_code == 403:
        response_403 = ErrorResponse.from_dict(response.json())



        return response_403

    if response.status_code == 409:
        response_409 = ErrorResponse.from_dict(response.json())



        return response_409

    if response.status_code == 413:
        response_413 = ErrorResponse.from_dict(response.json())



        return response_413

    if response.status_code == 415:
        response_415 = ErrorResponse.from_dict(response.json())



        return response_415

    if response.status_code == 422:
        response_422 = ErrorResponse.from_dict(response.json())



        return response_422

    if response.status_code == 429:
        response_429 = ErrorResponse.from_dict(response.json())



        return response_429

    if response.status_code == 503:
        response_503 = ErrorResponse.from_dict(response.json())



        return response_503

    if response.status_code == 504:
        response_504 = ErrorResponse.from_dict(response.json())



        return response_504

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[ErrorResponse | JobAccepted | ParsedDocument | RawParseResult]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: ParseSyncBody,
    idempotency_key: str,

) -> Response[ErrorResponse | JobAccepted | ParsedDocument | RawParseResult]:
    r""" Parse a document synchronously

     Admit a parse job, wait up to the sync wait limit, and return the selected terminal parse
    representation when ready. `output_format` defaults to the versioned provider-neutral
    `openparser@1`; `raw` returns a stable provider envelope around the untouched successful
    Paddle result. Terminal `failed` within the wait window returns `422` `ErrorResponse`;
    terminal `indeterminate` returns `504` `ErrorResponse`. Returns `202` with a durable job
    reference and `Location` if the wait limit expires first.

    Example (`multipart/form-data`):

    ```bash
    curl -X POST 'https://api.openparser.dev/parse' \
      -H 'Authorization: Bearer YOUR_API_KEY' \
      -H \"Idempotency-Key: $(uuidgen 2>/dev/null || openssl rand -hex 16)\" \
      -F 'request={\"ocr_model\":\"paddleocr-
    vl-1.6\",\"output_format\":\"openparser@1\"};type=application/json' \
      -F 'file=@./document.pdf'
    ```

    Args:
        idempotency_key (str):
        body (ParseSyncBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | JobAccepted | ParsedDocument | RawParseResult]
     """


    kwargs = _get_kwargs(
        body=body,
idempotency_key=idempotency_key,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    *,
    client: AuthenticatedClient | Client,
    body: ParseSyncBody,
    idempotency_key: str,

) -> ErrorResponse | JobAccepted | ParsedDocument | RawParseResult | None:
    r""" Parse a document synchronously

     Admit a parse job, wait up to the sync wait limit, and return the selected terminal parse
    representation when ready. `output_format` defaults to the versioned provider-neutral
    `openparser@1`; `raw` returns a stable provider envelope around the untouched successful
    Paddle result. Terminal `failed` within the wait window returns `422` `ErrorResponse`;
    terminal `indeterminate` returns `504` `ErrorResponse`. Returns `202` with a durable job
    reference and `Location` if the wait limit expires first.

    Example (`multipart/form-data`):

    ```bash
    curl -X POST 'https://api.openparser.dev/parse' \
      -H 'Authorization: Bearer YOUR_API_KEY' \
      -H \"Idempotency-Key: $(uuidgen 2>/dev/null || openssl rand -hex 16)\" \
      -F 'request={\"ocr_model\":\"paddleocr-
    vl-1.6\",\"output_format\":\"openparser@1\"};type=application/json' \
      -F 'file=@./document.pdf'
    ```

    Args:
        idempotency_key (str):
        body (ParseSyncBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | JobAccepted | ParsedDocument | RawParseResult
     """


    return sync_detailed(
        client=client,
body=body,
idempotency_key=idempotency_key,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: ParseSyncBody,
    idempotency_key: str,

) -> Response[ErrorResponse | JobAccepted | ParsedDocument | RawParseResult]:
    r""" Parse a document synchronously

     Admit a parse job, wait up to the sync wait limit, and return the selected terminal parse
    representation when ready. `output_format` defaults to the versioned provider-neutral
    `openparser@1`; `raw` returns a stable provider envelope around the untouched successful
    Paddle result. Terminal `failed` within the wait window returns `422` `ErrorResponse`;
    terminal `indeterminate` returns `504` `ErrorResponse`. Returns `202` with a durable job
    reference and `Location` if the wait limit expires first.

    Example (`multipart/form-data`):

    ```bash
    curl -X POST 'https://api.openparser.dev/parse' \
      -H 'Authorization: Bearer YOUR_API_KEY' \
      -H \"Idempotency-Key: $(uuidgen 2>/dev/null || openssl rand -hex 16)\" \
      -F 'request={\"ocr_model\":\"paddleocr-
    vl-1.6\",\"output_format\":\"openparser@1\"};type=application/json' \
      -F 'file=@./document.pdf'
    ```

    Args:
        idempotency_key (str):
        body (ParseSyncBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | JobAccepted | ParsedDocument | RawParseResult]
     """


    kwargs = _get_kwargs(
        body=body,
idempotency_key=idempotency_key,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: ParseSyncBody,
    idempotency_key: str,

) -> ErrorResponse | JobAccepted | ParsedDocument | RawParseResult | None:
    r""" Parse a document synchronously

     Admit a parse job, wait up to the sync wait limit, and return the selected terminal parse
    representation when ready. `output_format` defaults to the versioned provider-neutral
    `openparser@1`; `raw` returns a stable provider envelope around the untouched successful
    Paddle result. Terminal `failed` within the wait window returns `422` `ErrorResponse`;
    terminal `indeterminate` returns `504` `ErrorResponse`. Returns `202` with a durable job
    reference and `Location` if the wait limit expires first.

    Example (`multipart/form-data`):

    ```bash
    curl -X POST 'https://api.openparser.dev/parse' \
      -H 'Authorization: Bearer YOUR_API_KEY' \
      -H \"Idempotency-Key: $(uuidgen 2>/dev/null || openssl rand -hex 16)\" \
      -F 'request={\"ocr_model\":\"paddleocr-
    vl-1.6\",\"output_format\":\"openparser@1\"};type=application/json' \
      -F 'file=@./document.pdf'
    ```

    Args:
        idempotency_key (str):
        body (ParseSyncBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | JobAccepted | ParsedDocument | RawParseResult
     """


    return (await asyncio_detailed(
        client=client,
body=body,
idempotency_key=idempotency_key,

    )).parsed
