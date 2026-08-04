from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from typing import Literal, cast

if TYPE_CHECKING:
  from ..models.confidence import Confidence
  from ..models.geometry import Geometry
  from ..models.source_provenance import SourceProvenance
  from ..models.structured_value import StructuredValue





T = TypeVar("T", bound="KeyValueElement")



@_attrs_define
class KeyValueElement:
    """
        Attributes:
            id (str):
            locations (list[Geometry]):
            kind (Literal['key_value']):
            key (StructuredValue):
            value (StructuredValue):
            confidence (Confidence | Unset):
            source (SourceProvenance | Unset):
     """

    id: str
    locations: list[Geometry]
    kind: Literal['key_value']
    key: StructuredValue
    value: StructuredValue
    confidence: Confidence | Unset = UNSET
    source: SourceProvenance | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.source_provenance import SourceProvenance
        from ..models.structured_value import StructuredValue
        id = self.id

        locations = []
        for locations_item_data in self.locations:
            locations_item = locations_item_data.to_dict()
            locations.append(locations_item)



        kind = self.kind

        key = self.key.to_dict()

        value = self.value.to_dict()

        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()

        source: dict[str, Any] | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "locations": locations,
            "kind": kind,
            "key": key,
            "value": value,
        })
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if source is not UNSET:
            field_dict["source"] = source

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.source_provenance import SourceProvenance
        from ..models.structured_value import StructuredValue
        d = dict(src_dict)
        id = d.pop("id")

        locations = []
        _locations = d.pop("locations")
        for locations_item_data in (_locations):
            locations_item = Geometry.from_dict(locations_item_data)



            locations.append(locations_item)


        kind = cast(Literal['key_value'] , d.pop("kind"))
        if kind != 'key_value':
            raise ValueError(f"kind must match const 'key_value', got '{kind}'")

        key = StructuredValue.from_dict(d.pop("key"))




        value = StructuredValue.from_dict(d.pop("value"))




        _confidence = d.pop("confidence", UNSET)
        confidence: Confidence | Unset
        if isinstance(_confidence,  Unset):
            confidence = UNSET
        else:
            confidence = Confidence.from_dict(_confidence)




        _source = d.pop("source", UNSET)
        source: SourceProvenance | Unset
        if isinstance(_source,  Unset):
            source = UNSET
        else:
            source = SourceProvenance.from_dict(_source)




        key_value_element = cls(
            id=id,
            locations=locations,
            kind=kind,
            key=key,
            value=value,
            confidence=confidence,
            source=source,
        )

        return key_value_element
