from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error_response import ErrorResponse
from ...models.job import Job
from ...types import UNSET, Unset
from typing import cast



def _get_kwargs(
    id: str,
    *,
    cursor: str | Unset = UNSET,
    limit: int | Unset = 50,

) -> dict[str, Any]:




    params: dict[str, Any] = {}

    params["cursor"] = cursor

    params["limit"] = limit


    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}


    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/jobs/{id}".format(id=quote(str(id), safe=""),),
        "params": params,
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> ErrorResponse | Job | None:
    if response.status_code == 200:
        response_200 = Job.from_dict(response.json())



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

    if response.status_code == 429:
        response_429 = ErrorResponse.from_dict(response.json())



        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[ErrorResponse | Job]:
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
    cursor: str | Unset = UNSET,
    limit: int | Unset = 50,

) -> Response[ErrorResponse | Job]:
    """ Get job status and result

     Tenant-scoped durable job read. Jobs belonging to another tenant return `404`. Batch jobs
    include cursor-paginated child summaries. Playground tokens (`ocr:playground`) and `ocr:full`
    keys are both accepted. Successful parse jobs return the originally requested `output_format`
    in `result`; use `GET /jobs/{id}/result?format=` to select an alternate stored representation
    without re-running OCR.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
        cursor (str | Unset):
        limit (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | Job]
     """


    kwargs = _get_kwargs(
        id=id,
cursor=cursor,
limit=limit,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    id: str,
    *,
    client: AuthenticatedClient | Client,
    cursor: str | Unset = UNSET,
    limit: int | Unset = 50,

) -> ErrorResponse | Job | None:
    """ Get job status and result

     Tenant-scoped durable job read. Jobs belonging to another tenant return `404`. Batch jobs
    include cursor-paginated child summaries. Playground tokens (`ocr:playground`) and `ocr:full`
    keys are both accepted. Successful parse jobs return the originally requested `output_format`
    in `result`; use `GET /jobs/{id}/result?format=` to select an alternate stored representation
    without re-running OCR.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
        cursor (str | Unset):
        limit (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | Job
     """


    return sync_detailed(
        id=id,
client=client,
cursor=cursor,
limit=limit,

    ).parsed

async def asyncio_detailed(
    id: str,
    *,
    client: AuthenticatedClient | Client,
    cursor: str | Unset = UNSET,
    limit: int | Unset = 50,

) -> Response[ErrorResponse | Job]:
    """ Get job status and result

     Tenant-scoped durable job read. Jobs belonging to another tenant return `404`. Batch jobs
    include cursor-paginated child summaries. Playground tokens (`ocr:playground`) and `ocr:full`
    keys are both accepted. Successful parse jobs return the originally requested `output_format`
    in `result`; use `GET /jobs/{id}/result?format=` to select an alternate stored representation
    without re-running OCR.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
        cursor (str | Unset):
        limit (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | Job]
     """


    kwargs = _get_kwargs(
        id=id,
cursor=cursor,
limit=limit,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    id: str,
    *,
    client: AuthenticatedClient | Client,
    cursor: str | Unset = UNSET,
    limit: int | Unset = 50,

) -> ErrorResponse | Job | None:
    """ Get job status and result

     Tenant-scoped durable job read. Jobs belonging to another tenant return `404`. Batch jobs
    include cursor-paginated child summaries. Playground tokens (`ocr:playground`) and `ocr:full`
    keys are both accepted. Successful parse jobs return the originally requested `output_format`
    in `result`; use `GET /jobs/{id}/result?format=` to select an alternate stored representation
    without re-running OCR.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
        cursor (str | Unset):
        limit (int | Unset):  Default: 50.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | Job
     """


    return (await asyncio_detailed(
        id=id,
client=client,
cursor=cursor,
limit=limit,

    )).parsed
