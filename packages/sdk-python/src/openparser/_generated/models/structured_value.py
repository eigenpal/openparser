from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.confidence import Confidence
  from ..models.geometry import Geometry
  from ..models.text_span import TextSpan





T = TypeVar("T", bound="StructuredValue")



@_attrs_define
class StructuredValue:
    """
        Attributes:
            text (str):
            spans (list[TextSpan]):
            element_ids (list[str]):
            locations (list[Geometry]):
            confidence (Confidence | Unset):
     """

    text: str
    spans: list[TextSpan]
    element_ids: list[str]
    locations: list[Geometry]
    confidence: Confidence | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.text_span import TextSpan
        text = self.text

        spans = []
        for spans_item_data in self.spans:
            spans_item = spans_item_data.to_dict()
            spans.append(spans_item)



        element_ids = self.element_ids



        locations = []
        for locations_item_data in self.locations:
            locations_item = locations_item_data.to_dict()
            locations.append(locations_item)



        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "text": text,
            "spans": spans,
            "element_ids": element_ids,
            "locations": locations,
        })
        if confidence is not UNSET:
            field_dict["confidence"] = confidence

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.text_span import TextSpan
        d = dict(src_dict)
        text = d.pop("text")

        spans = []
        _spans = d.pop("spans")
        for spans_item_data in (_spans):
            spans_item = TextSpan.from_dict(spans_item_data)



            spans.append(spans_item)


        element_ids = cast(list[str], d.pop("element_ids"))


        locations = []
        _locations = d.pop("locations")
        for locations_item_data in (_locations):
            locations_item = Geometry.from_dict(locations_item_data)



            locations.append(locations_item)


        _confidence = d.pop("confidence", UNSET)
        confidence: Confidence | Unset
        if isinstance(_confidence,  Unset):
            confidence = UNSET
        else:
            confidence = Confidence.from_dict(_confidence)




        structured_value = cls(
            text=text,
            spans=spans,
            element_ids=element_ids,
            locations=locations,
            confidence=confidence,
        )

        return structured_value
