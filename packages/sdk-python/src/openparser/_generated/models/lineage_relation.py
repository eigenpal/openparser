from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.lineage_relation_type import LineageRelationType
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.lineage_relation_attributes import LineageRelationAttributes





T = TypeVar("T", bound="LineageRelation")



@_attrs_define
class LineageRelation:
    """
        Attributes:
            type_ (LineageRelationType):
            source (str):
            target (str):
            attributes (LineageRelationAttributes | Unset):
     """

    type_: LineageRelationType
    source: str
    target: str
    attributes: LineageRelationAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_relation_attributes import LineageRelationAttributes
        type_ = self.type_.value

        source = self.source

        target = self.target

        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "type": type_,
            "source": source,
            "target": target,
        })
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_relation_attributes import LineageRelationAttributes
        d = dict(src_dict)
        type_ = LineageRelationType(d.pop("type"))




        source = d.pop("source")

        target = d.pop("target")

        _attributes = d.pop("attributes", UNSET)
        attributes: LineageRelationAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageRelationAttributes.from_dict(_attributes)




        lineage_relation = cls(
            type_=type_,
            source=source,
            target=target,
            attributes=attributes,
        )

        return lineage_relation
