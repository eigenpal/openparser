from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error_response import ErrorResponse
from ...models.job_list_response import JobListResponse
from ...models.job_operation import JobOperation
from ...models.job_status import JobStatus
from ...types import UNSET, Unset
from typing import cast



def _get_kwargs(
    *,
    cursor: str | Unset = UNSET,
    limit: int | Unset = 25,
    status: JobStatus | Unset = UNSET,
    operation: JobOperation | Unset = UNSET,

) -> dict[str, Any]:




    params: dict[str, Any] = {}

    params["cursor"] = cursor

    params["limit"] = limit

    json_status: str | Unset = UNSET
    if not isinstance(status, Unset):
        json_status = status.value

    params["status"] = json_status

    json_operation: str | Unset = UNSET
    if not isinstance(operation, Unset):
        json_operation = operation.value

    params["operation"] = json_operation


    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}


    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/jobs",
        "params": params,
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> ErrorResponse | JobListResponse | None:
    if response.status_code == 200:
        response_200 = JobListResponse.from_dict(response.json())



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

    if response.status_code == 429:
        response_429 = ErrorResponse.from_dict(response.json())



        return response_429

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[ErrorResponse | JobListResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    cursor: str | Unset = UNSET,
    limit: int | Unset = 25,
    status: JobStatus | Unset = UNSET,
    operation: JobOperation | Unset = UNSET,

) -> Response[ErrorResponse | JobListResponse]:
    """ List jobs

     Tenant-scoped chronological list of top-level OCR jobs (batch children are omitted).
    Returns lightweight summaries only — full results remain on `GET /jobs/{id}`.
    Cursor pagination is stable newest-first with an `id` tie-break. Optional `status`
    and `operation` filters are validated strictly; unknown values return `400`.

    Args:
        cursor (str | Unset):
        limit (int | Unset):  Default: 25.
        status (JobStatus | Unset): Durable job status. For batch parent jobs, status is derived
            from children after each
            child transition:
            1. If any child is non-terminal, the parent remains `queued` only while every child is
               queued; it becomes `running` once any child is running or terminal.
            2. When every child is terminal and any child is `indeterminate`, the parent is
               `indeterminate`.
            3. When every child is terminal, none are `indeterminate`, and any child is `failed`:
               the parent is `failed` if zero children succeeded, otherwise `succeeded` (mixed
               success/failure closes as parent `succeeded` while preserving failed children in
               summaries).
            4. When every child is `succeeded`, the parent is `succeeded`.

            Partial failures are always retained on child summaries; parent status does not drop
            failed children from results.
        operation (JobOperation | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | JobListResponse]
     """


    kwargs = _get_kwargs(
        cursor=cursor,
limit=limit,
status=status,
operation=operation,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    *,
    client: AuthenticatedClient | Client,
    cursor: str | Unset = UNSET,
    limit: int | Unset = 25,
    status: JobStatus | Unset = UNSET,
    operation: JobOperation | Unset = UNSET,

) -> ErrorResponse | JobListResponse | None:
    """ List jobs

     Tenant-scoped chronological list of top-level OCR jobs (batch children are omitted).
    Returns lightweight summaries only — full results remain on `GET /jobs/{id}`.
    Cursor pagination is stable newest-first with an `id` tie-break. Optional `status`
    and `operation` filters are validated strictly; unknown values return `400`.

    Args:
        cursor (str | Unset):
        limit (int | Unset):  Default: 25.
        status (JobStatus | Unset): Durable job status. For batch parent jobs, status is derived
            from children after each
            child transition:
            1. If any child is non-terminal, the parent remains `queued` only while every child is
               queued; it becomes `running` once any child is running or terminal.
            2. When every child is terminal and any child is `indeterminate`, the parent is
               `indeterminate`.
            3. When every child is terminal, none are `indeterminate`, and any child is `failed`:
               the parent is `failed` if zero children succeeded, otherwise `succeeded` (mixed
               success/failure closes as parent `succeeded` while preserving failed children in
               summaries).
            4. When every child is `succeeded`, the parent is `succeeded`.

            Partial failures are always retained on child summaries; parent status does not drop
            failed children from results.
        operation (JobOperation | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | JobListResponse
     """


    return sync_detailed(
        client=client,
cursor=cursor,
limit=limit,
status=status,
operation=operation,

    ).parsed

async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    cursor: str | Unset = UNSET,
    limit: int | Unset = 25,
    status: JobStatus | Unset = UNSET,
    operation: JobOperation | Unset = UNSET,

) -> Response[ErrorResponse | JobListResponse]:
    """ List jobs

     Tenant-scoped chronological list of top-level OCR jobs (batch children are omitted).
    Returns lightweight summaries only — full results remain on `GET /jobs/{id}`.
    Cursor pagination is stable newest-first with an `id` tie-break. Optional `status`
    and `operation` filters are validated strictly; unknown values return `400`.

    Args:
        cursor (str | Unset):
        limit (int | Unset):  Default: 25.
        status (JobStatus | Unset): Durable job status. For batch parent jobs, status is derived
            from children after each
            child transition:
            1. If any child is non-terminal, the parent remains `queued` only while every child is
               queued; it becomes `running` once any child is running or terminal.
            2. When every child is terminal and any child is `indeterminate`, the parent is
               `indeterminate`.
            3. When every child is terminal, none are `indeterminate`, and any child is `failed`:
               the parent is `failed` if zero children succeeded, otherwise `succeeded` (mixed
               success/failure closes as parent `succeeded` while preserving failed children in
               summaries).
            4. When every child is `succeeded`, the parent is `succeeded`.

            Partial failures are always retained on child summaries; parent status does not drop
            failed children from results.
        operation (JobOperation | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | JobListResponse]
     """


    kwargs = _get_kwargs(
        cursor=cursor,
limit=limit,
status=status,
operation=operation,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    cursor: str | Unset = UNSET,
    limit: int | Unset = 25,
    status: JobStatus | Unset = UNSET,
    operation: JobOperation | Unset = UNSET,

) -> ErrorResponse | JobListResponse | None:
    """ List jobs

     Tenant-scoped chronological list of top-level OCR jobs (batch children are omitted).
    Returns lightweight summaries only — full results remain on `GET /jobs/{id}`.
    Cursor pagination is stable newest-first with an `id` tie-break. Optional `status`
    and `operation` filters are validated strictly; unknown values return `400`.

    Args:
        cursor (str | Unset):
        limit (int | Unset):  Default: 25.
        status (JobStatus | Unset): Durable job status. For batch parent jobs, status is derived
            from children after each
            child transition:
            1. If any child is non-terminal, the parent remains `queued` only while every child is
               queued; it becomes `running` once any child is running or terminal.
            2. When every child is terminal and any child is `indeterminate`, the parent is
               `indeterminate`.
            3. When every child is terminal, none are `indeterminate`, and any child is `failed`:
               the parent is `failed` if zero children succeeded, otherwise `succeeded` (mixed
               success/failure closes as parent `succeeded` while preserving failed children in
               summaries).
            4. When every child is `succeeded`, the parent is `succeeded`.

            Partial failures are always retained on child summaries; parent status does not drop
            failed children from results.
        operation (JobOperation | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | JobListResponse
     """


    return (await asyncio_detailed(
        client=client,
cursor=cursor,
limit=limit,
status=status,
operation=operation,

    )).parsed
