from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.lineage_agent_attributes import LineageAgentAttributes





T = TypeVar("T", bound="LineageAgent")



@_attrs_define
class LineageAgent:
    """
        Attributes:
            type_ (str | Unset):
            name (str | Unset):
            attributes (LineageAgentAttributes | Unset):
     """

    type_: str | Unset = UNSET
    name: str | Unset = UNSET
    attributes: LineageAgentAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_agent_attributes import LineageAgentAttributes
        type_ = self.type_

        name = self.name

        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
        })
        if type_ is not UNSET:
            field_dict["type"] = type_
        if name is not UNSET:
            field_dict["name"] = name
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_agent_attributes import LineageAgentAttributes
        d = dict(src_dict)
        type_ = d.pop("type", UNSET)

        name = d.pop("name", UNSET)

        _attributes = d.pop("attributes", UNSET)
        attributes: LineageAgentAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageAgentAttributes.from_dict(_attributes)




        lineage_agent = cls(
            type_=type_,
            name=name,
            attributes=attributes,
        )

        return lineage_agent
