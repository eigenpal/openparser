from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.create_extraction_pipeline_request import CreateExtractionPipelineRequest
from ...models.error_response import ErrorResponse
from ...models.extraction_pipeline import ExtractionPipeline
from typing import cast



def _get_kwargs(
    *,
    body: CreateExtractionPipelineRequest,

) -> dict[str, Any]:
    headers: dict[str, Any] = {}






    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/pipelines",
    }

    _kwargs["json"] = body.to_dict()


    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> ErrorResponse | ExtractionPipeline | None:
    if response.status_code == 200:
        response_200 = ExtractionPipeline.from_dict(response.json())



        return response_200

    if response.status_code == 400:
        response_400 = ErrorResponse.from_dict(response.json())



        return response_400

    if response.status_code == 401:
        response_401 = ErrorResponse.from_dict(response.json())



        return response_401

    if response.status_code == 403:
        response_403 = ErrorResponse.from_dict(response.json())



        return response_403

    if response.status_code == 409:
        response_409 = ErrorResponse.from_dict(response.json())



        return response_409

    if response.status_code == 422:
        response_422 = ErrorResponse.from_dict(response.json())



        return response_422

    if response.status_code == 429:
        response_429 = ErrorResponse.from_dict(response.json())



        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[ErrorResponse | ExtractionPipeline]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: CreateExtractionPipelineRequest,

) -> Response[ErrorResponse | ExtractionPipeline]:
    """ Create a saved extraction pipeline

     Persist a tenant-scoped extraction configuration (OCR model, LLM model, schema,
    repair/grounding/reasoning). Validated with the same admission gates as extract.
    Playground tokens and `ocr:full` keys are both accepted.

    Args:
        body (CreateExtractionPipelineRequest): Create a tenant-scoped saved extraction
            configuration.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | ExtractionPipeline]
     """


    kwargs = _get_kwargs(
        body=body,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    *,
    client: AuthenticatedClient | Client,
    body: CreateExtractionPipelineRequest,

) -> ErrorResponse | ExtractionPipeline | None:
    """ Create a saved extraction pipeline

     Persist a tenant-scoped extraction configuration (OCR model, LLM model, schema,
    repair/grounding/reasoning). Validated with the same admission gates as extract.
    Playground tokens and `ocr:full` keys are both accepted.

    Args:
        body (CreateExtractionPipelineRequest): Create a tenant-scoped saved extraction
            configuration.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | ExtractionPipeline
     """


    return sync_detailed(
        client=client,
body=body,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: CreateExtractionPipelineRequest,

) -> Response[ErrorResponse | ExtractionPipeline]:
    """ Create a saved extraction pipeline

     Persist a tenant-scoped extraction configuration (OCR model, LLM model, schema,
    repair/grounding/reasoning). Validated with the same admission gates as extract.
    Playground tokens and `ocr:full` keys are both accepted.

    Args:
        body (CreateExtractionPipelineRequest): Create a tenant-scoped saved extraction
            configuration.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | ExtractionPipeline]
     """


    kwargs = _get_kwargs(
        body=body,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: CreateExtractionPipelineRequest,

) -> ErrorResponse | ExtractionPipeline | None:
    """ Create a saved extraction pipeline

     Persist a tenant-scoped extraction configuration (OCR model, LLM model, schema,
    repair/grounding/reasoning). Validated with the same admission gates as extract.
    Playground tokens and `ocr:full` keys are both accepted.

    Args:
        body (CreateExtractionPipelineRequest): Create a tenant-scoped saved extraction
            configuration.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | ExtractionPipeline
     """


    return (await asyncio_detailed(
        client=client,
body=body,

    )).parsed
