from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.job_accepted_operation import JobAcceptedOperation
from ..models.job_status import JobStatus
from ..models.ocr_output_format import OcrOutputFormat
from dateutil.parser import isoparse
from typing import cast
import datetime






T = TypeVar("T", bound="JobAccepted")



@_attrs_define
class JobAccepted:
    """
        Attributes:
            id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
            operation (JobAcceptedOperation):
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
            created_at (datetime.datetime):
            updated_at (datetime.datetime):
     """

    id: str
    operation: JobAcceptedOperation
    status: JobStatus
    output_format: OcrOutputFormat
    created_at: datetime.datetime
    updated_at: datetime.datetime





    def to_dict(self) -> dict[str, Any]:
        id = self.id

        operation = self.operation.value

        status = self.status.value

        output_format = self.output_format.value

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "operation": operation,
            "status": status,
            "output_format": output_format,
            "created_at": created_at,
            "updated_at": updated_at,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        operation = JobAcceptedOperation(d.pop("operation"))




        status = JobStatus(d.pop("status"))




        output_format = OcrOutputFormat(d.pop("output_format"))




        created_at = isoparse(d.pop("created_at"))




        updated_at = isoparse(d.pop("updated_at"))




        job_accepted = cls(
            id=id,
            operation=operation,
            status=status,
            output_format=output_format,
            created_at=created_at,
            updated_at=updated_at,
        )

        return job_accepted
