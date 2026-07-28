from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ...client import AuthenticatedClient, Client
from ...types import Response, UNSET
from ... import errors

from ...models.error_response import ErrorResponse
from ...models.ocr_output_format import OcrOutputFormat
from ...models.parsed_document import ParsedDocument
from ...models.raw_parse_result import RawParseResult
from ...types import UNSET, Unset
from typing import cast



def _get_kwargs(
    id: str,
    *,
    format_: OcrOutputFormat | Unset = UNSET,

) -> dict[str, Any]:




    params: dict[str, Any] = {}

    json_format_: str | Unset = UNSET
    if not isinstance(format_, Unset):
        json_format_ = format_.value

    params["format"] = json_format_


    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}


    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/jobs/{id}/result".format(id=quote(str(id), safe=""),),
        "params": params,
    }


    return _kwargs



def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> ErrorResponse | ParsedDocument | RawParseResult | None:
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

    if response.status_code == 422:
        response_422 = ErrorResponse.from_dict(response.json())



        return response_422

    if response.status_code == 429:
        response_429 = ErrorResponse.from_dict(response.json())



        return response_429

    if response.status_code == 504:
        response_504 = ErrorResponse.from_dict(response.json())



        return response_504

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[ErrorResponse | ParsedDocument | RawParseResult]:
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
    format_: OcrOutputFormat | Unset = UNSET,

) -> Response[ErrorResponse | ParsedDocument | RawParseResult]:
    """ Get a parse job result representation

     Return the selected parse wire body for a tenant-owned succeeded parse job.
    `format` defaults to the job's original `output_format`. Fresh dual-artifact parses
    can serve either `openparser@1` or `raw` from object storage without re-running HPS
    or charging pages. Historical jobs only serve the representation already present in
    `result_json`; unavailable alternates return `422 result_format_unavailable` with
    guidance. Non-terminal jobs return `409 job_not_terminal`. Playground tokens
    (`ocr:playground`) and `ocr:full` keys are both accepted.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
        format_ (OcrOutputFormat | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | ParsedDocument | RawParseResult]
     """


    kwargs = _get_kwargs(
        id=id,
format_=format_,

    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)

def sync(
    id: str,
    *,
    client: AuthenticatedClient | Client,
    format_: OcrOutputFormat | Unset = UNSET,

) -> ErrorResponse | ParsedDocument | RawParseResult | None:
    """ Get a parse job result representation

     Return the selected parse wire body for a tenant-owned succeeded parse job.
    `format` defaults to the job's original `output_format`. Fresh dual-artifact parses
    can serve either `openparser@1` or `raw` from object storage without re-running HPS
    or charging pages. Historical jobs only serve the representation already present in
    `result_json`; unavailable alternates return `422 result_format_unavailable` with
    guidance. Non-terminal jobs return `409 job_not_terminal`. Playground tokens
    (`ocr:playground`) and `ocr:full` keys are both accepted.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
        format_ (OcrOutputFormat | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | ParsedDocument | RawParseResult
     """


    return sync_detailed(
        id=id,
client=client,
format_=format_,

    ).parsed

async def asyncio_detailed(
    id: str,
    *,
    client: AuthenticatedClient | Client,
    format_: OcrOutputFormat | Unset = UNSET,

) -> Response[ErrorResponse | ParsedDocument | RawParseResult]:
    """ Get a parse job result representation

     Return the selected parse wire body for a tenant-owned succeeded parse job.
    `format` defaults to the job's original `output_format`. Fresh dual-artifact parses
    can serve either `openparser@1` or `raw` from object storage without re-running HPS
    or charging pages. Historical jobs only serve the representation already present in
    `result_json`; unavailable alternates return `422 result_format_unavailable` with
    guidance. Non-terminal jobs return `409 job_not_terminal`. Playground tokens
    (`ocr:playground`) and `ocr:full` keys are both accepted.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
        format_ (OcrOutputFormat | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ErrorResponse | ParsedDocument | RawParseResult]
     """


    kwargs = _get_kwargs(
        id=id,
format_=format_,

    )

    response = await client.get_async_httpx_client().request(
        **kwargs
    )

    return _build_response(client=client, response=response)

async def asyncio(
    id: str,
    *,
    client: AuthenticatedClient | Client,
    format_: OcrOutputFormat | Unset = UNSET,

) -> ErrorResponse | ParsedDocument | RawParseResult | None:
    """ Get a parse job result representation

     Return the selected parse wire body for a tenant-owned succeeded parse job.
    `format` defaults to the job's original `output_format`. Fresh dual-artifact parses
    can serve either `openparser@1` or `raw` from object storage without re-running HPS
    or charging pages. Historical jobs only serve the representation already present in
    `result_json`; unavailable alternates return `422 result_format_unavailable` with
    guidance. Non-terminal jobs return `409 job_not_terminal`. Playground tokens
    (`ocr:playground`) and `ocr:full` keys are both accepted.

    Args:
        id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
        format_ (OcrOutputFormat | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ErrorResponse | ParsedDocument | RawParseResult
     """


    return (await asyncio_detailed(
        id=id,
client=client,
format_=format_,

    )).parsed
