from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response
from ... import errors

from ...models.error_response import ErrorResponse



def _get_kwargs(
    id: str,

) -> dict[str, Any]:






    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/jobs/{id}/source".format(id=quote(str(id), safe=""),),
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Any | ErrorResponse | bytes | None:
    if response.status_code == 200:
        response_200 = response.content



        return response_200

    if response.status_code == 206:
        response_206 = response.content



        return response_206

    if response.status_code == 401:
        response_401 = ErrorResponse.from_dict(response.json())



        return response_401

    if response.status_code == 403:
        response_403 = ErrorResponse.from_dict(response.json())



        return response_403

    if response.status_code == 404:
        response_404 = ErrorResponse.from_dict(response.json())



        return response_404

    if response.status_code == 416:
        response_416 = cast(Any, None)
        return response_416

    if response.status_code == 429:
        response_429 = ErrorResponse.from_dict(response.json())



        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Any | ErrorResponse | bytes]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    id: str,
    *,
    client: AuthenticatedClient | Client,

) -> Response[Any | ErrorResponse | bytes]:
    """ Download retained job source bytes

     Stream the retained source document for a parse or single-document extract job. Jobs without
    retained source bytes return `404 source_not_available`. Check `has_source` on `GET /jobs/{id}`
    before calling. Playground tokens (`ocr:playground`) and `ocr:full` keys are both accepted,
    matching other job read routes. Optional `Range` requests may return `206` partial content or
    `416` when the range is unsatisfiable.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | ErrorResponse | bytes]
     """


    kwargs = _get_kwargs(
        id=id,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    id: str,
    *,
    client: AuthenticatedClient | Client,

) -> Any | ErrorResponse | bytes | None:
    """ Download retained job source bytes

     Stream the retained source document for a parse or single-document extract job. Jobs without
    retained source bytes return `404 source_not_available`. Check `has_source` on `GET /jobs/{id}`
    before calling. Playground tokens (`ocr:playground`) and `ocr:full` keys are both accepted,
    matching other job read routes. Optional `Range` requests may return `206` partial content or
    `416` when the range is unsatisfiable.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | ErrorResponse | bytes
     """


    return sync_detailed(
        id=id,
client=client,

    ).parsed

async def asyncio_detailed(
    id: str,
    *,
    client: AuthenticatedClient | Client,

) -> Response[Any | ErrorResponse | bytes]:
    """ Download retained job source bytes

     Stream the retained source document for a parse or single-document extract job. Jobs without
    retained source bytes return `404 source_not_available`. Check `has_source` on `GET /jobs/{id}`
    before calling. Playground tokens (`ocr:playground`) and `ocr:full` keys are both accepted,
    matching other job read routes. Optional `Range` requests may return `206` partial content or
    `416` when the range is unsatisfiable.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | ErrorResponse | bytes]
     """


    kwargs = _get_kwargs(
        id=id,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    id: str,
    *,
    client: AuthenticatedClient | Client,

) -> Any | ErrorResponse | bytes | None:
    """ Download retained job source bytes

     Stream the retained source document for a parse or single-document extract job. Jobs without
    retained source bytes return `404 source_not_available`. Check `has_source` on `GET /jobs/{id}`
    before calling. Playground tokens (`ocr:playground`) and `ocr:full` keys are both accepted,
    matching other job read routes. Optional `Range` requests may return `206` partial content or
    `416` when the range is unsatisfiable.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | ErrorResponse | bytes
     """


    return (await asyncio_detailed(
        id=id,
client=client,

    )).parsed
