from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="JobProgress")



@_attrs_define
class JobProgress:
    """
        Attributes:
            completed (int | Unset):
            total (int | Unset):
     """

    completed: int | Unset = UNSET
    total: int | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        completed = self.completed

        total = self.total


        field_dict: dict[str, Any] = {}

        field_dict.update({
        })
        if completed is not UNSET:
            field_dict["completed"] = completed
        if total is not UNSET:
            field_dict["total"] = total

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        completed = d.pop("completed", UNSET)

        total = d.pop("total", UNSET)

        job_progress = cls(
            completed=completed,
            total=total,
        )

        return job_progress
