from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.job_status import JobStatus
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime






T = TypeVar("T", bound="JobRelatedExtractionsItem")



@_attrs_define
class JobRelatedExtractionsItem:
    """
        Attributes:
            id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
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
            created_at (datetime.datetime):
            updated_at (datetime.datetime):
            has_result (bool):
            url (str):
            llm_model (None | str | Unset):
     """

    id: str
    status: JobStatus
    created_at: datetime.datetime
    updated_at: datetime.datetime
    has_result: bool
    url: str
    llm_model: None | str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        id = self.id

        status = self.status.value

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        has_result = self.has_result

        url = self.url

        llm_model: None | str | Unset
        if isinstance(self.llm_model, Unset):
            llm_model = UNSET
        else:
            llm_model = self.llm_model


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "status": status,
            "created_at": created_at,
            "updated_at": updated_at,
            "has_result": has_result,
            "url": url,
        })
        if llm_model is not UNSET:
            field_dict["llm_model"] = llm_model

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        status = JobStatus(d.pop("status"))




        created_at = isoparse(d.pop("created_at"))




        updated_at = isoparse(d.pop("updated_at"))




        has_result = d.pop("has_result")

        url = d.pop("url")

        def _parse_llm_model(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        llm_model = _parse_llm_model(d.pop("llm_model", UNSET))


        job_related_extractions_item = cls(
            id=id,
            status=status,
            created_at=created_at,
            updated_at=updated_at,
            has_result=has_result,
            url=url,
            llm_model=llm_model,
        )

        return job_related_extractions_item
