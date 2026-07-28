from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error_response import ErrorResponse
from ...models.extract_sync_body import ExtractSyncBody
from ...models.extraction_terminal_result import ExtractionTerminalResult
from ...models.job_accepted import JobAccepted
from typing import cast



def _get_kwargs(
    *,
    body: ExtractSyncBody,
    idempotency_key: str,

) -> dict[str, Any]:
    headers: dict[str, Any] = {}
    headers["Idempotency-Key"] = idempotency_key







    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/extract",
    }

    _kwargs["files"] = body.to_multipart()



    _kwargs["headers"] = headers
    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> ErrorResponse | ExtractionTerminalResult | JobAccepted | None:
    if response.status_code == 200:
        response_200 = ExtractionTerminalResult.from_dict(response.json())



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


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[ErrorResponse | ExtractionTerminalResult | JobAccepted]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: ExtractSyncBody,
    idempotency_key: str,

) -> Response[ErrorResponse | ExtractionTerminalResult | JobAccepted]:
    """ Extract structured data synchronously

     Admit a single extract job from file bytes, `file_id`, or a tenant-owned succeeded
    `parse_job_id`, then run schema-constrained OpenRouter extraction via `llm_model`. A
    `parse_job_id` source reuses the canonical ParsedDocument (from dual artifacts or legacy
    `result_json`) without OCR or another page charge; historical raw-only parses return
    `422 canonical_result_unavailable`. Wait up to the sync wait limit and return
    `ExtractionTerminalResult` when ready. Terminal `failed` within the wait window returns
    `422`; terminal `indeterminate` returns `504`. Returns `202` with a durable job reference
    and `Location` if the wait expires.

    Args:
        idempotency_key (str):
        body (ExtractSyncBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | ExtractionTerminalResult | JobAccepted]
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
    body: ExtractSyncBody,
    idempotency_key: str,

) -> ErrorResponse | ExtractionTerminalResult | JobAccepted | None:
    """ Extract structured data synchronously

     Admit a single extract job from file bytes, `file_id`, or a tenant-owned succeeded
    `parse_job_id`, then run schema-constrained OpenRouter extraction via `llm_model`. A
    `parse_job_id` source reuses the canonical ParsedDocument (from dual artifacts or legacy
    `result_json`) without OCR or another page charge; historical raw-only parses return
    `422 canonical_result_unavailable`. Wait up to the sync wait limit and return
    `ExtractionTerminalResult` when ready. Terminal `failed` within the wait window returns
    `422`; terminal `indeterminate` returns `504`. Returns `202` with a durable job reference
    and `Location` if the wait expires.

    Args:
        idempotency_key (str):
        body (ExtractSyncBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | ExtractionTerminalResult | JobAccepted
     """


    return sync_detailed(
        client=client,
body=body,
idempotency_key=idempotency_key,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: ExtractSyncBody,
    idempotency_key: str,

) -> Response[ErrorResponse | ExtractionTerminalResult | JobAccepted]:
    """ Extract structured data synchronously

     Admit a single extract job from file bytes, `file_id`, or a tenant-owned succeeded
    `parse_job_id`, then run schema-constrained OpenRouter extraction via `llm_model`. A
    `parse_job_id` source reuses the canonical ParsedDocument (from dual artifacts or legacy
    `result_json`) without OCR or another page charge; historical raw-only parses return
    `422 canonical_result_unavailable`. Wait up to the sync wait limit and return
    `ExtractionTerminalResult` when ready. Terminal `failed` within the wait window returns
    `422`; terminal `indeterminate` returns `504`. Returns `202` with a durable job reference
    and `Location` if the wait expires.

    Args:
        idempotency_key (str):
        body (ExtractSyncBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | ExtractionTerminalResult | JobAccepted]
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
    body: ExtractSyncBody,
    idempotency_key: str,

) -> ErrorResponse | ExtractionTerminalResult | JobAccepted | None:
    """ Extract structured data synchronously

     Admit a single extract job from file bytes, `file_id`, or a tenant-owned succeeded
    `parse_job_id`, then run schema-constrained OpenRouter extraction via `llm_model`. A
    `parse_job_id` source reuses the canonical ParsedDocument (from dual artifacts or legacy
    `result_json`) without OCR or another page charge; historical raw-only parses return
    `422 canonical_result_unavailable`. Wait up to the sync wait limit and return
    `ExtractionTerminalResult` when ready. Terminal `failed` within the wait window returns
    `422`; terminal `indeterminate` returns `504`. Returns `202` with a durable job reference
    and `Location` if the wait expires.

    Args:
        idempotency_key (str):
        body (ExtractSyncBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | ExtractionTerminalResult | JobAccepted
     """


    return (await asyncio_detailed(
        client=client,
body=body,
idempotency_key=idempotency_key,

    )).parsed
