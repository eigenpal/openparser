from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error_response import ErrorResponse
from ...models.suggest_schema_request import SuggestSchemaRequest
from ...models.suggest_schema_response import SuggestSchemaResponse
from typing import cast



def _get_kwargs(
    *,
    body: SuggestSchemaRequest,

) -> dict[str, Any]:
    headers: dict[str, Any] = {}






    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/suggest-schema",
    }

    _kwargs["json"] = body.to_dict()


    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> ErrorResponse | SuggestSchemaResponse | None:
    if response.status_code == 200:
        response_200 = SuggestSchemaResponse.from_dict(response.json())



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

    if response.status_code == 404:
        response_404 = ErrorResponse.from_dict(response.json())



        return response_404

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


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[ErrorResponse | SuggestSchemaResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: SuggestSchemaRequest,

) -> Response[ErrorResponse | SuggestSchemaResponse]:
    """ Suggest an extraction schema

     Suggest an extraction JSON Schema from a tenant-owned succeeded parse result.
    Optional `hint` is capped at 500 characters. Definitive failures return
    `schema_suggestion_failed`.

    Args:
        body (SuggestSchemaRequest): Suggest an extraction JSON Schema from a tenant-owned
            succeeded `parse` job.
            Optional `hint` is caller guidance capped at 500 characters.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | SuggestSchemaResponse]
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
    body: SuggestSchemaRequest,

) -> ErrorResponse | SuggestSchemaResponse | None:
    """ Suggest an extraction schema

     Suggest an extraction JSON Schema from a tenant-owned succeeded parse result.
    Optional `hint` is capped at 500 characters. Definitive failures return
    `schema_suggestion_failed`.

    Args:
        body (SuggestSchemaRequest): Suggest an extraction JSON Schema from a tenant-owned
            succeeded `parse` job.
            Optional `hint` is caller guidance capped at 500 characters.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | SuggestSchemaResponse
     """


    return sync_detailed(
        client=client,
body=body,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: SuggestSchemaRequest,

) -> Response[ErrorResponse | SuggestSchemaResponse]:
    """ Suggest an extraction schema

     Suggest an extraction JSON Schema from a tenant-owned succeeded parse result.
    Optional `hint` is capped at 500 characters. Definitive failures return
    `schema_suggestion_failed`.

    Args:
        body (SuggestSchemaRequest): Suggest an extraction JSON Schema from a tenant-owned
            succeeded `parse` job.
            Optional `hint` is caller guidance capped at 500 characters.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | SuggestSchemaResponse]
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
    body: SuggestSchemaRequest,

) -> ErrorResponse | SuggestSchemaResponse | None:
    """ Suggest an extraction schema

     Suggest an extraction JSON Schema from a tenant-owned succeeded parse result.
    Optional `hint` is capped at 500 characters. Definitive failures return
    `schema_suggestion_failed`.

    Args:
        body (SuggestSchemaRequest): Suggest an extraction JSON Schema from a tenant-owned
            succeeded `parse` job.
            Optional `hint` is caller guidance capped at 500 characters.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | SuggestSchemaResponse
     """


    return (await asyncio_detailed(
        client=client,
body=body,

    )).parsed
