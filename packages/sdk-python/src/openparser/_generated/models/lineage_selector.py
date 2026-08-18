from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.lineage_selector_attributes import LineageSelectorAttributes





T = TypeVar("T", bound="LineageSelector")



@_attrs_define
class LineageSelector:
    """
        Attributes:
            type_ (str):
            value (Any):
            attributes (LineageSelectorAttributes | Unset):
     """

    type_: str
    value: Any
    attributes: LineageSelectorAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_selector_attributes import LineageSelectorAttributes
        type_ = self.type_

        value = self.value

        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "type": type_,
            "value": value,
        })
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_selector_attributes import LineageSelectorAttributes
        d = dict(src_dict)
        type_ = d.pop("type")

        value = d.pop("value")

        _attributes = d.pop("attributes", UNSET)
        attributes: LineageSelectorAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageSelectorAttributes.from_dict(_attributes)




        lineage_selector = cls(
            type_=type_,
            value=value,
            attributes=attributes,
        )

        return lineage_selector
