from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.lineage_association_attributes import LineageAssociationAttributes





T = TypeVar("T", bound="LineageAssociation")



@_attrs_define
class LineageAssociation:
    """
        Attributes:
            agent (str):
            role (str | Unset):
            attributes (LineageAssociationAttributes | Unset):
     """

    agent: str
    role: str | Unset = UNSET
    attributes: LineageAssociationAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_association_attributes import LineageAssociationAttributes
        agent = self.agent

        role = self.role

        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "agent": agent,
        })
        if role is not UNSET:
            field_dict["role"] = role
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_association_attributes import LineageAssociationAttributes
        d = dict(src_dict)
        agent = d.pop("agent")

        role = d.pop("role", UNSET)

        _attributes = d.pop("attributes", UNSET)
        attributes: LineageAssociationAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageAssociationAttributes.from_dict(_attributes)




        lineage_association = cls(
            agent=agent,
            role=role,
            attributes=attributes,
        )

        return lineage_association
