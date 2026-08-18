from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error_response import ErrorResponse
from ...models.extraction_review import ExtractionReview
from typing import cast



def _get_kwargs(
    id: str,

) -> dict[str, Any]:






    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/jobs/{id}/review".format(id=quote(str(id), safe=""),),
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> ErrorResponse | ExtractionReview | None:
    if response.status_code == 200:
        response_200 = ExtractionReview.from_dict(response.json())



        return response_200

    if response.status_code == 401:
        response_401 = ErrorResponse.from_dict(response.json())



        return response_401

    if response.status_code == 403:
        response_403 = ErrorResponse.from_dict(response.json())



        return response_403

    if response.status_code == 404:
        response_404 = ErrorResponse.from_dict(response.json())



        return response_404

    if response.status_code == 409:
        response_409 = ErrorResponse.from_dict(response.json())



        return response_409

    if response.status_code == 429:
        response_429 = ErrorResponse.from_dict(response.json())



        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[ErrorResponse | ExtractionReview]:
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

) -> Response[ErrorResponse | ExtractionReview]:
    """ Get an extraction review

     Return the immutable machine output beside the current corrected output and append-only
    review events. A succeeded extraction with no confirmations returns a synthesized pending review
    at version 0. Cross-tenant and unknown jobs return `404`.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | ExtractionReview]
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

) -> ErrorResponse | ExtractionReview | None:
    """ Get an extraction review

     Return the immutable machine output beside the current corrected output and append-only
    review events. A succeeded extraction with no confirmations returns a synthesized pending review
    at version 0. Cross-tenant and unknown jobs return `404`.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | ExtractionReview
     """


    return sync_detailed(
        id=id,
client=client,

    ).parsed

async def asyncio_detailed(
    id: str,
    *,
    client: AuthenticatedClient | Client,

) -> Response[ErrorResponse | ExtractionReview]:
    """ Get an extraction review

     Return the immutable machine output beside the current corrected output and append-only
    review events. A succeeded extraction with no confirmations returns a synthesized pending review
    at version 0. Cross-tenant and unknown jobs return `404`.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | ExtractionReview]
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

) -> ErrorResponse | ExtractionReview | None:
    """ Get an extraction review

     Return the immutable machine output beside the current corrected output and append-only
    review events. A succeeded extraction with no confirmations returns a synthesized pending review
    at version 0. Cross-tenant and unknown jobs return `404`.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | ExtractionReview
     """


    return (await asyncio_detailed(
        id=id,
client=client,

    )).parsed
