from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="PageBlockPolygonType0Item")



@_attrs_define
class PageBlockPolygonType0Item:
    """
        Attributes:
            x (float):
            y (float):
     """

    x: float
    y: float





    def to_dict(self) -> dict[str, Any]:
        x = self.x

        y = self.y


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "x": x,
            "y": y,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        x = d.pop("x")

        y = d.pop("y")

        page_block_polygon_type_0_item = cls(
            x=x,
            y=y,
        )

        return page_block_polygon_type_0_item
