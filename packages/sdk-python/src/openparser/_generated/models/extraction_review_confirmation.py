from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="ExtractionReviewConfirmation")



@_attrs_define
class ExtractionReviewConfirmation:
    """ This field should say `value`, signed by the caller. Editing and approving are the same act.

        Attributes:
            path (str):
            value (Any):
            note (str | Unset):
     """

    path: str
    value: Any
    note: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        path = self.path

        value = self.value

        note = self.note


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "path": path,
            "value": value,
        })
        if note is not UNSET:
            field_dict["note"] = note

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        path = d.pop("path")

        value = d.pop("value")

        note = d.pop("note", UNSET)

        extraction_review_confirmation = cls(
            path=path,
            value=value,
            note=note,
        )

        return extraction_review_confirmation
