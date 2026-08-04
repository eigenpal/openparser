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
  from ..models.text_span import TextSpan





T = TypeVar("T", bound="FigureElement")



@_attrs_define
class FigureElement:
    """
        Attributes:
            id (str):
            locations (list[Geometry]):
            kind (Literal['figure']):
            caption_spans (list[TextSpan]):
            confidence (Confidence | Unset):
            source (SourceProvenance | Unset):
            asset_id (str | Unset):
            caption (str | Unset):
            alt_text (str | Unset):
     """

    id: str
    locations: list[Geometry]
    kind: Literal['figure']
    caption_spans: list[TextSpan]
    confidence: Confidence | Unset = UNSET
    source: SourceProvenance | Unset = UNSET
    asset_id: str | Unset = UNSET
    caption: str | Unset = UNSET
    alt_text: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.source_provenance import SourceProvenance
        from ..models.text_span import TextSpan
        id = self.id

        locations = []
        for locations_item_data in self.locations:
            locations_item = locations_item_data.to_dict()
            locations.append(locations_item)



        kind = self.kind

        caption_spans = []
        for caption_spans_item_data in self.caption_spans:
            caption_spans_item = caption_spans_item_data.to_dict()
            caption_spans.append(caption_spans_item)



        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()

        source: dict[str, Any] | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.to_dict()

        asset_id = self.asset_id

        caption = self.caption

        alt_text = self.alt_text


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "locations": locations,
            "kind": kind,
            "caption_spans": caption_spans,
        })
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if source is not UNSET:
            field_dict["source"] = source
        if asset_id is not UNSET:
            field_dict["asset_id"] = asset_id
        if caption is not UNSET:
            field_dict["caption"] = caption
        if alt_text is not UNSET:
            field_dict["alt_text"] = alt_text

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.source_provenance import SourceProvenance
        from ..models.text_span import TextSpan
        d = dict(src_dict)
        id = d.pop("id")

        locations = []
        _locations = d.pop("locations")
        for locations_item_data in (_locations):
            locations_item = Geometry.from_dict(locations_item_data)



            locations.append(locations_item)


        kind = cast(Literal['figure'] , d.pop("kind"))
        if kind != 'figure':
            raise ValueError(f"kind must match const 'figure', got '{kind}'")

        caption_spans = []
        _caption_spans = d.pop("caption_spans")
        for caption_spans_item_data in (_caption_spans):
            caption_spans_item = TextSpan.from_dict(caption_spans_item_data)



            caption_spans.append(caption_spans_item)


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




        asset_id = d.pop("asset_id", UNSET)

        caption = d.pop("caption", UNSET)

        alt_text = d.pop("alt_text", UNSET)

        figure_element = cls(
            id=id,
            locations=locations,
            kind=kind,
            caption_spans=caption_spans,
            confidence=confidence,
            source=source,
            asset_id=asset_id,
            caption=caption,
            alt_text=alt_text,
        )

        return figure_element
