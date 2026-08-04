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





T = TypeVar("T", bound="StampElement")



@_attrs_define
class StampElement:
    """
        Attributes:
            id (str):
            locations (list[Geometry]):
            kind (Literal['stamp']):
            confidence (Confidence | Unset):
            source (SourceProvenance | Unset):
            text (str | Unset):
     """

    id: str
    locations: list[Geometry]
    kind: Literal['stamp']
    confidence: Confidence | Unset = UNSET
    source: SourceProvenance | Unset = UNSET
    text: str | Unset = UNSET





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

        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()

        source: dict[str, Any] | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.to_dict()

        text = self.text


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "locations": locations,
            "kind": kind,
        })
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if source is not UNSET:
            field_dict["source"] = source
        if text is not UNSET:
            field_dict["text"] = text

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


        kind = cast(Literal['stamp'] , d.pop("kind"))
        if kind != 'stamp':
            raise ValueError(f"kind must match const 'stamp', got '{kind}'")

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




        text = d.pop("text", UNSET)

        stamp_element = cls(
            id=id,
            locations=locations,
            kind=kind,
            confidence=confidence,
            source=source,
            text=text,
        )

        return stamp_element
