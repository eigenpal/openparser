from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.lineage_confidence_assertion_sources_item_type import LineageConfidenceAssertionSourcesItemType






T = TypeVar("T", bound="LineageConfidenceAssertionSourcesItem")



@_attrs_define
class LineageConfidenceAssertionSourcesItem:
    """
        Attributes:
            type_ (LineageConfidenceAssertionSourcesItemType):
            id (str):
     """

    type_: LineageConfidenceAssertionSourcesItemType
    id: str





    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_.value

        id = self.id


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "type": type_,
            "id": id,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        type_ = LineageConfidenceAssertionSourcesItemType(d.pop("type"))




        id = d.pop("id")

        lineage_confidence_assertion_sources_item = cls(
            type_=type_,
            id=id,
        )

        return lineage_confidence_assertion_sources_item
