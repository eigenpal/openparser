from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error_response import ErrorResponse
from ...models.list_llm_models_mode import ListLlmModelsMode
from ...models.ocr_llm_models_response import OcrLlmModelsResponse
from ...types import UNSET, Unset
from typing import cast



def _get_kwargs(
    *,
    mode: ListLlmModelsMode | Unset = ListLlmModelsMode.SUGGESTED,
    q: str | Unset = UNSET,
    page: int | Unset = 1,
    limit: int | Unset = 25,

) -> dict[str, Any]:




    params: dict[str, Any] = {}

    json_mode: str | Unset = UNSET
    if not isinstance(mode, Unset):
        json_mode = mode.value

    params["mode"] = json_mode

    params["q"] = q

    params["page"] = page

    params["limit"] = limit


    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}


    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/models/llm",
        "params": params,
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> ErrorResponse | OcrLlmModelsResponse | None:
    if response.status_code == 200:
        response_200 = OcrLlmModelsResponse.from_dict(response.json())



        return response_200

    if response.status_code == 401:
        response_401 = ErrorResponse.from_dict(response.json())



        return response_401

    if response.status_code == 403:
        response_403 = ErrorResponse.from_dict(response.json())



        return response_403

    if response.status_code == 429:
        response_429 = ErrorResponse.from_dict(response.json())



        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[ErrorResponse | OcrLlmModelsResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    mode: ListLlmModelsMode | Unset = ListLlmModelsMode.SUGGESTED,
    q: str | Unset = UNSET,
    page: int | Unset = 1,
    limit: int | Unset = 25,

) -> Response[ErrorResponse | OcrLlmModelsResponse]:
    """ List compatible LLM models

     Returns a cached, normalized OpenRouter catalog filtered to models that advertise
    strict structured output (`structured_outputs` + `response_format`), have valid finite
    provider-list cost (internally) that is converted to customer retail rates, produce text, and are
    not expired.

    Default `mode=suggested` returns a short recommended subset. `mode=search` discovers the
    full compatible catalog with optional `q` / pagination. Field grounding and schema
    suggestion remain restricted to certified models.

    Args:
        mode (ListLlmModelsMode | Unset):  Default: ListLlmModelsMode.SUGGESTED.
        q (str | Unset):
        page (int | Unset):  Default: 1.
        limit (int | Unset):  Default: 25.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | OcrLlmModelsResponse]
     """


    kwargs = _get_kwargs(
        mode=mode,
q=q,
page=page,
limit=limit,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    *,
    client: AuthenticatedClient | Client,
    mode: ListLlmModelsMode | Unset = ListLlmModelsMode.SUGGESTED,
    q: str | Unset = UNSET,
    page: int | Unset = 1,
    limit: int | Unset = 25,

) -> ErrorResponse | OcrLlmModelsResponse | None:
    """ List compatible LLM models

     Returns a cached, normalized OpenRouter catalog filtered to models that advertise
    strict structured output (`structured_outputs` + `response_format`), have valid finite
    provider-list cost (internally) that is converted to customer retail rates, produce text, and are
    not expired.

    Default `mode=suggested` returns a short recommended subset. `mode=search` discovers the
    full compatible catalog with optional `q` / pagination. Field grounding and schema
    suggestion remain restricted to certified models.

    Args:
        mode (ListLlmModelsMode | Unset):  Default: ListLlmModelsMode.SUGGESTED.
        q (str | Unset):
        page (int | Unset):  Default: 1.
        limit (int | Unset):  Default: 25.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | OcrLlmModelsResponse
     """


    return sync_detailed(
        client=client,
mode=mode,
q=q,
page=page,
limit=limit,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    mode: ListLlmModelsMode | Unset = ListLlmModelsMode.SUGGESTED,
    q: str | Unset = UNSET,
    page: int | Unset = 1,
    limit: int | Unset = 25,

) -> Response[ErrorResponse | OcrLlmModelsResponse]:
    """ List compatible LLM models

     Returns a cached, normalized OpenRouter catalog filtered to models that advertise
    strict structured output (`structured_outputs` + `response_format`), have valid finite
    provider-list cost (internally) that is converted to customer retail rates, produce text, and are
    not expired.

    Default `mode=suggested` returns a short recommended subset. `mode=search` discovers the
    full compatible catalog with optional `q` / pagination. Field grounding and schema
    suggestion remain restricted to certified models.

    Args:
        mode (ListLlmModelsMode | Unset):  Default: ListLlmModelsMode.SUGGESTED.
        q (str | Unset):
        page (int | Unset):  Default: 1.
        limit (int | Unset):  Default: 25.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | OcrLlmModelsResponse]
     """


    kwargs = _get_kwargs(
        mode=mode,
q=q,
page=page,
limit=limit,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    mode: ListLlmModelsMode | Unset = ListLlmModelsMode.SUGGESTED,
    q: str | Unset = UNSET,
    page: int | Unset = 1,
    limit: int | Unset = 25,

) -> ErrorResponse | OcrLlmModelsResponse | None:
    """ List compatible LLM models

     Returns a cached, normalized OpenRouter catalog filtered to models that advertise
    strict structured output (`structured_outputs` + `response_format`), have valid finite
    provider-list cost (internally) that is converted to customer retail rates, produce text, and are
    not expired.

    Default `mode=suggested` returns a short recommended subset. `mode=search` discovers the
    full compatible catalog with optional `q` / pagination. Field grounding and schema
    suggestion remain restricted to certified models.

    Args:
        mode (ListLlmModelsMode | Unset):  Default: ListLlmModelsMode.SUGGESTED.
        q (str | Unset):
        page (int | Unset):  Default: 1.
        limit (int | Unset):  Default: 25.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | OcrLlmModelsResponse
     """


    return (await asyncio_detailed(
        client=client,
mode=mode,
q=q,
page=page,
limit=limit,

    )).parsed
