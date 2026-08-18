from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.lineage_entity_approvals_item_attributes import LineageEntityApprovalsItemAttributes





T = TypeVar("T", bound="LineageEntityApprovalsItem")



@_attrs_define
class LineageEntityApprovalsItem:
    """
        Attributes:
            agent (str):
            at (datetime.datetime):
            note (str | Unset):
            attributes (LineageEntityApprovalsItemAttributes | Unset):
     """

    agent: str
    at: datetime.datetime
    note: str | Unset = UNSET
    attributes: LineageEntityApprovalsItemAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_entity_approvals_item_attributes import LineageEntityApprovalsItemAttributes
        agent = self.agent

        at = self.at.isoformat()

        note = self.note

        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "agent": agent,
            "at": at,
        })
        if note is not UNSET:
            field_dict["note"] = note
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_entity_approvals_item_attributes import LineageEntityApprovalsItemAttributes
        d = dict(src_dict)
        agent = d.pop("agent")

        at = isoparse(d.pop("at"))




        note = d.pop("note", UNSET)

        _attributes = d.pop("attributes", UNSET)
        attributes: LineageEntityApprovalsItemAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageEntityApprovalsItemAttributes.from_dict(_attributes)




        lineage_entity_approvals_item = cls(
            agent=agent,
            at=at,
            note=note,
            attributes=attributes,
        )

        return lineage_entity_approvals_item
