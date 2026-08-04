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





T = TypeVar("T", bound="BarcodeElement")



@_attrs_define
class BarcodeElement:
    """
        Attributes:
            id (str):
            locations (list[Geometry]):
            kind (Literal['barcode']):
            value (str):
            confidence (Confidence | Unset):
            source (SourceProvenance | Unset):
            symbology (str | Unset):
     """

    id: str
    locations: list[Geometry]
    kind: Literal['barcode']
    value: str
    confidence: Confidence | Unset = UNSET
    source: SourceProvenance | Unset = UNSET
    symbology: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.source_provenance import SourceProvenance
        id = self.id

        locations = []
        for locations_item_data in self.locations:
            locations_item = locations_item_data.to_dict()
            locations.append(locations_item)



        kind = self.kind

        value = self.value

        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()

        source: dict[str, Any] | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.to_dict()

        symbology = self.symbology


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "locations": locations,
            "kind": kind,
            "value": value,
        })
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if source is not UNSET:
            field_dict["source"] = source
        if symbology is not UNSET:
            field_dict["symbology"] = symbology

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.source_provenance import SourceProvenance
        d = dict(src_dict)
        id = d.pop("id")

        locations = []
        _locations = d.pop("locations")
        for locations_item_data in (_locations):
            locations_item = Geometry.from_dict(locations_item_data)



            locations.append(locations_item)


        kind = cast(Literal['barcode'] , d.pop("kind"))
        if kind != 'barcode':
            raise ValueError(f"kind must match const 'barcode', got '{kind}'")

        value = d.pop("value")

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




        symbology = d.pop("symbology", UNSET)

        barcode_element = cls(
            id=id,
            locations=locations,
            kind=kind,
            value=value,
            confidence=confidence,
            source=source,
            symbology=symbology,
        )

        return barcode_element
