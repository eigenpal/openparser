from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.job_operation import JobOperation
from ..models.job_status import JobStatus
from ..models.ocr_output_format import OcrOutputFormat
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.job_failure import JobFailure





T = TypeVar("T", bound="JobSummary")



@_attrs_define
class JobSummary:
    """ Lightweight list row for `GET /jobs`. Omits result bodies, idempotency keys,
    storage object keys, and provider cost fields.

        Attributes:
            id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
            operation (JobOperation):
            status (JobStatus): Durable job status. For batch parent jobs, status is derived from children after each
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
            output_format (OcrOutputFormat):
            page_count (int):
            created_at (datetime.datetime):
            updated_at (datetime.datetime):
            has_result (bool): True when `GET /jobs/{id}` includes a terminal `result`.
            url (str): Path-absolute job resource URL (for example `/jobs/{id}`).
            pipeline_id (None | str): Snapshot of the saved extraction pipeline id at admit time, or `null` for parse jobs,
                inline extract config, and other non-pipeline work.
            pipeline_version (int | None): Snapshot of the saved extraction pipeline version at admit time, or `null` when
                `pipeline_id` is `null`.
            ocr_model (None | str | Unset):
            llm_model (None | str | Unset):
            error (JobFailure | Unset):
            has_source (bool | Unset):
     """

    id: str
    operation: JobOperation
    status: JobStatus
    output_format: OcrOutputFormat
    page_count: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    has_result: bool
    url: str
    pipeline_id: None | str
    pipeline_version: int | None
    ocr_model: None | str | Unset = UNSET
    llm_model: None | str | Unset = UNSET
    error: JobFailure | Unset = UNSET
    has_source: bool | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.job_failure import JobFailure
        id = self.id

        operation = self.operation.value

        status = self.status.value

        output_format = self.output_format.value

        page_count = self.page_count

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        has_result = self.has_result

        url = self.url

        pipeline_id: None | str
        pipeline_id = self.pipeline_id

        pipeline_version: int | None
        pipeline_version = self.pipeline_version

        ocr_model: None | str | Unset
        if isinstance(self.ocr_model, Unset):
            ocr_model = UNSET
        else:
            ocr_model = self.ocr_model

        llm_model: None | str | Unset
        if isinstance(self.llm_model, Unset):
            llm_model = UNSET
        else:
            llm_model = self.llm_model

        error: dict[str, Any] | Unset = UNSET
        if not isinstance(self.error, Unset):
            error = self.error.to_dict()

        has_source = self.has_source


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "operation": operation,
            "status": status,
            "output_format": output_format,
            "page_count": page_count,
            "created_at": created_at,
            "updated_at": updated_at,
            "has_result": has_result,
            "url": url,
            "pipeline_id": pipeline_id,
            "pipeline_version": pipeline_version,
        })
        if ocr_model is not UNSET:
            field_dict["ocr_model"] = ocr_model
        if llm_model is not UNSET:
            field_dict["llm_model"] = llm_model
        if error is not UNSET:
            field_dict["error"] = error
        if has_source is not UNSET:
            field_dict["has_source"] = has_source

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.job_failure import JobFailure
        d = dict(src_dict)
        id = d.pop("id")

        operation = JobOperation(d.pop("operation"))




        status = JobStatus(d.pop("status"))




        output_format = OcrOutputFormat(d.pop("output_format"))




        page_count = d.pop("page_count")

        created_at = isoparse(d.pop("created_at"))




        updated_at = isoparse(d.pop("updated_at"))




        has_result = d.pop("has_result")

        url = d.pop("url")

        def _parse_pipeline_id(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        pipeline_id = _parse_pipeline_id(d.pop("pipeline_id"))


        def _parse_pipeline_version(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        pipeline_version = _parse_pipeline_version(d.pop("pipeline_version"))


        def _parse_ocr_model(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        ocr_model = _parse_ocr_model(d.pop("ocr_model", UNSET))


        def _parse_llm_model(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        llm_model = _parse_llm_model(d.pop("llm_model", UNSET))


        _error = d.pop("error", UNSET)
        error: JobFailure | Unset
        if isinstance(_error,  Unset):
            error = UNSET
        else:
            error = JobFailure.from_dict(_error)




        has_source = d.pop("has_source", UNSET)

        job_summary = cls(
            id=id,
            operation=operation,
            status=status,
            output_format=output_format,
            page_count=page_count,
            created_at=created_at,
            updated_at=updated_at,
            has_result=has_result,
            url=url,
            pipeline_id=pipeline_id,
            pipeline_version=pipeline_version,
            ocr_model=ocr_model,
            llm_model=llm_model,
            error=error,
            has_source=has_source,
        )

        return job_summary
