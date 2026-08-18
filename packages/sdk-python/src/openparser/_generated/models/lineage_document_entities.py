from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
  from ..models.lineage_entity import LineageEntity





T = TypeVar("T", bound="LineageDocumentEntities")



@_attrs_define
class LineageDocumentEntities:
    """
     """

    additional_properties: dict[str, LineageEntity] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_entity import LineageEntity

        field_dict: dict[str, Any] = {}
        for prop_name, prop in self.additional_properties.items():
            field_dict[prop_name] = prop.to_dict()


        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_entity import LineageEntity
        d = dict(src_dict)
        lineage_document_entities = cls(
        )


        from ..models.lineage_attribution import LineageAttribution
        from ..models.lineage_confidence_assertion import LineageConfidenceAssertion
        from ..models.lineage_digest import LineageDigest
        from ..models.lineage_entity_approvals_item import LineageEntityApprovalsItem
        from ..models.lineage_entity_attributes import LineageEntityAttributes
        from ..models.lineage_entity_schema import LineageEntitySchema
        from ..models.lineage_locator import LineageLocator
        from ..models.lineage_selector import LineageSelector
        additional_properties = {}
        for prop_name, prop_dict in d.items():
            additional_property = LineageEntity.from_dict(prop_dict)



            additional_properties[prop_name] = additional_property

        lineage_document_entities.additional_properties = additional_properties
        return lineage_document_entities

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> LineageEntity:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: LineageEntity) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
