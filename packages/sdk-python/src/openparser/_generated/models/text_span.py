from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="TextSpan")



@_attrs_define
class TextSpan:
    """
        Attributes:
            start (int):
            end (int):
     """

    start: int
    end: int





    def to_dict(self) -> dict[str, Any]:
        start = self.start

        end = self.end


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "start": start,
            "end": end,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        start = d.pop("start")

        end = d.pop("end")

        text_span = cls(
            start=start,
            end=end,
        )

        return text_span
