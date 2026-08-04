from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="BoundingBox")



@_attrs_define
class BoundingBox:
    """ Axis-aligned integer page coordinates with exclusive right and bottom edges.

        Attributes:
            left (float):
            top (float):
            right (float):
            bottom (float):
     """

    left: float
    top: float
    right: float
    bottom: float





    def to_dict(self) -> dict[str, Any]:
        left = self.left

        top = self.top

        right = self.right

        bottom = self.bottom


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "left": left,
            "top": top,
            "right": right,
            "bottom": bottom,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        left = d.pop("left")

        top = d.pop("top")

        right = d.pop("right")

        bottom = d.pop("bottom")

        bounding_box = cls(
            left=left,
            top=top,
            right=right,
            bottom=bottom,
        )

        return bounding_box
