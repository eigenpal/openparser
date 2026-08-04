from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.text_break import TextBreak
from ..models.text_role import TextRole
from ..types import UNSET, Unset
from typing import cast
from typing import Literal, cast

if TYPE_CHECKING:
  from ..models.confidence import Confidence
  from ..models.geometry import Geometry
  from ..models.language import Language
  from ..models.source_provenance import SourceProvenance
  from ..models.text_span import TextSpan
  from ..models.text_style import TextStyle





T = TypeVar("T", bound="TextElement")



@_attrs_define
class TextElement:
    """
        Attributes:
            id (str):
            locations (list[Geometry]):
            kind (Literal['text']):
            role (TextRole):
            text (str):
            spans (list[TextSpan]):
            languages (list[Language]):
            confidence (Confidence | Unset):
            source (SourceProvenance | Unset):
            style (TextStyle | Unset):
            break_after (TextBreak | Unset):
     """

    id: str
    locations: list[Geometry]
    kind: Literal['text']
    role: TextRole
    text: str
    spans: list[TextSpan]
    languages: list[Language]
    confidence: Confidence | Unset = UNSET
    source: SourceProvenance | Unset = UNSET
    style: TextStyle | Unset = UNSET
    break_after: TextBreak | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.language import Language
        from ..models.source_provenance import SourceProvenance
        from ..models.text_span import TextSpan
        from ..models.text_style import TextStyle
        id = self.id

        locations = []
        for locations_item_data in self.locations:
            locations_item = locations_item_data.to_dict()
            locations.append(locations_item)



        kind = self.kind

        role = self.role.value

        text = self.text

        spans = []
        for spans_item_data in self.spans:
            spans_item = spans_item_data.to_dict()
            spans.append(spans_item)



        languages = []
        for languages_item_data in self.languages:
            languages_item = languages_item_data.to_dict()
            languages.append(languages_item)



        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()

        source: dict[str, Any] | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.to_dict()

        style: dict[str, Any] | Unset = UNSET
        if not isinstance(self.style, Unset):
            style = self.style.to_dict()

        break_after: str | Unset = UNSET
        if not isinstance(self.break_after, Unset):
            break_after = self.break_after.value



        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "locations": locations,
            "kind": kind,
            "role": role,
            "text": text,
            "spans": spans,
            "languages": languages,
        })
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if source is not UNSET:
            field_dict["source"] = source
        if style is not UNSET:
            field_dict["style"] = style
        if break_after is not UNSET:
            field_dict["break_after"] = break_after

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.language import Language
        from ..models.source_provenance import SourceProvenance
        from ..models.text_span import TextSpan
        from ..models.text_style import TextStyle
        d = dict(src_dict)
        id = d.pop("id")

        locations = []
        _locations = d.pop("locations")
        for locations_item_data in (_locations):
            locations_item = Geometry.from_dict(locations_item_data)



            locations.append(locations_item)


        kind = cast(Literal['text'] , d.pop("kind"))
        if kind != 'text':
            raise ValueError(f"kind must match const 'text', got '{kind}'")

        role = TextRole(d.pop("role"))




        text = d.pop("text")

        spans = []
        _spans = d.pop("spans")
        for spans_item_data in (_spans):
            spans_item = TextSpan.from_dict(spans_item_data)



            spans.append(spans_item)


        languages = []
        _languages = d.pop("languages")
        for languages_item_data in (_languages):
            languages_item = Language.from_dict(languages_item_data)



            languages.append(languages_item)


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




        _style = d.pop("style", UNSET)
        style: TextStyle | Unset
        if isinstance(_style,  Unset):
            style = UNSET
        else:
            style = TextStyle.from_dict(_style)




        _break_after = d.pop("break_after", UNSET)
        break_after: TextBreak | Unset
        if isinstance(_break_after,  Unset):
            break_after = UNSET
        else:
            break_after = TextBreak(_break_after)




        text_element = cls(
            id=id,
            locations=locations,
            kind=kind,
            role=role,
            text=text,
            spans=spans,
            languages=languages,
            confidence=confidence,
            source=source,
            style=style,
            break_after=break_after,
        )

        return text_element
