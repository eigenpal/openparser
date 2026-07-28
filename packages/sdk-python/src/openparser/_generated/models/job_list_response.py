from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
  from ..models.job_summary import JobSummary





T = TypeVar("T", bound="JobListResponse")



@_attrs_define
class JobListResponse:
    """ Cursor-paginated page of job summaries for the authenticated tenant.

        Attributes:
            data (list[JobSummary]):
            next_cursor (None | str): Opaque cursor for the next page, or `null` when exhausted.
     """

    data: list[JobSummary]
    next_cursor: None | str





    def to_dict(self) -> dict[str, Any]:
        from ..models.job_summary import JobSummary
        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)



        next_cursor: None | str
        next_cursor = self.next_cursor


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "data": data,
            "next_cursor": next_cursor,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.job_summary import JobSummary
        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in (_data):
            data_item = JobSummary.from_dict(data_item_data)



            data.append(data_item)


        def _parse_next_cursor(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_cursor = _parse_next_cursor(d.pop("next_cursor"))


        job_list_response = cls(
            data=data,
            next_cursor=next_cursor,
        )

        return job_list_response
