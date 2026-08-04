from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.relation_type import RelationType






T = TypeVar("T", bound="DocumentRelation")



@_attrs_define
class DocumentRelation:
    """
        Attributes:
            type_ (RelationType):
            from_id (str):
            to_id (str):
     """

    type_: RelationType
    from_id: str
    to_id: str





    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_.value

        from_id = self.from_id

        to_id = self.to_id


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "type": type_,
            "from_id": from_id,
            "to_id": to_id,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        type_ = RelationType(d.pop("type"))




        from_id = d.pop("from_id")

        to_id = d.pop("to_id")

        document_relation = cls(
            type_=type_,
            from_id=from_id,
            to_id=to_id,
        )

        return document_relation
