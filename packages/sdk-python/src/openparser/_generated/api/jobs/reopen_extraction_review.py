from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error_response import ErrorResponse
from ...models.extraction_review import ExtractionReview
from ...models.reopen_extraction_review_request import ReopenExtractionReviewRequest
from typing import cast



def _get_kwargs(
    id: str,
    *,
    body: ReopenExtractionReviewRequest,

) -> dict[str, Any]:
    headers: dict[str, Any] = {}






    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/jobs/{id}/review/reopen".format(id=quote(str(id), safe=""),),
    }

    _kwargs["json"] = body.to_dict()


    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> ErrorResponse | ExtractionReview | None:
    if response.status_code == 200:
        response_200 = ExtractionReview.from_dict(response.json())



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

    if response.status_code == 409:
        response_409 = ErrorResponse.from_dict(response.json())



        return response_409

    if response.status_code == 413:
        response_413 = ErrorResponse.from_dict(response.json())



        return response_413

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
    body: ReopenExtractionReviewRequest,

) -> Response[ErrorResponse | ExtractionReview]:
    """ Reopen a completed extraction review

     Take a sign-off back so the run returns to `pending` and its fields can be reviewed again.
    Only the reviewer who completed the run may reopen it. Both events stay in the log, so the
    trail shows the run was signed off and then reopened, while the review status and the
    lineage decision follow the live completion. Uses the same optimistic version check as
    field confirmations.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
        body (ReopenExtractionReviewRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | ExtractionReview]
     """


    kwargs = _get_kwargs(
        id=id,
body=body,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    id: str,
    *,
    client: AuthenticatedClient | Client,
    body: ReopenExtractionReviewRequest,

) -> ErrorResponse | ExtractionReview | None:
    """ Reopen a completed extraction review

     Take a sign-off back so the run returns to `pending` and its fields can be reviewed again.
    Only the reviewer who completed the run may reopen it. Both events stay in the log, so the
    trail shows the run was signed off and then reopened, while the review status and the
    lineage decision follow the live completion. Uses the same optimistic version check as
    field confirmations.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
        body (ReopenExtractionReviewRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | ExtractionReview
     """


    return sync_detailed(
        id=id,
client=client,
body=body,

    ).parsed

async def asyncio_detailed(
    id: str,
    *,
    client: AuthenticatedClient | Client,
    body: ReopenExtractionReviewRequest,

) -> Response[ErrorResponse | ExtractionReview]:
    """ Reopen a completed extraction review

     Take a sign-off back so the run returns to `pending` and its fields can be reviewed again.
    Only the reviewer who completed the run may reopen it. Both events stay in the log, so the
    trail shows the run was signed off and then reopened, while the review status and the
    lineage decision follow the live completion. Uses the same optimistic version check as
    field confirmations.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
        body (ReopenExtractionReviewRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | ExtractionReview]
     """


    kwargs = _get_kwargs(
        id=id,
body=body,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    id: str,
    *,
    client: AuthenticatedClient | Client,
    body: ReopenExtractionReviewRequest,

) -> ErrorResponse | ExtractionReview | None:
    """ Reopen a completed extraction review

     Take a sign-off back so the run returns to `pending` and its fields can be reviewed again.
    Only the reviewer who completed the run may reopen it. Both events stay in the log, so the
    trail shows the run was signed off and then reopened, while the review status and the
    lineage decision follow the live completion. Uses the same optimistic version check as
    field confirmations.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
        body (ReopenExtractionReviewRequest):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | ExtractionReview
     """


    return (await asyncio_detailed(
        id=id,
client=client,
body=body,

    )).parsed
