from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="LineageConfidenceScale")



@_attrs_define
class LineageConfidenceScale:
    """
        Attributes:
            min_ (float):
            max_ (float):
     """

    min_: float
    max_: float





    def to_dict(self) -> dict[str, Any]:
        min_ = self.min_

        max_ = self.max_


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "min": min_,
            "max": max_,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        min_ = d.pop("min")

        max_ = d.pop("max")

        lineage_confidence_scale = cls(
            min_=min_,
            max_=max_,
        )

        return lineage_confidence_scale
