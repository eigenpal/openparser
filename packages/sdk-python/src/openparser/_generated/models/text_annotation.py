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
  from ..models.language import Language
  from ..models.source_provenance import SourceProvenance
  from ..models.text_span import TextSpan
  from ..models.text_style import TextStyle





T = TypeVar("T", bound="TextAnnotation")



@_attrs_define
class TextAnnotation:
    """
        Attributes:
            id (str):
            spans (list[TextSpan]):
            languages (list[Language]):
            style (TextStyle | Unset):
            confidence (Confidence | Unset):
            source (SourceProvenance | Unset):
     """

    id: str
    spans: list[TextSpan]
    languages: list[Language]
    style: TextStyle | Unset = UNSET
    confidence: Confidence | Unset = UNSET
    source: SourceProvenance | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.confidence import Confidence
        from ..models.language import Language
        from ..models.source_provenance import SourceProvenance
        from ..models.text_span import TextSpan
        from ..models.text_style import TextStyle
        id = self.id

        spans = []
        for spans_item_data in self.spans:
            spans_item = spans_item_data.to_dict()
            spans.append(spans_item)



        languages = []
        for languages_item_data in self.languages:
            languages_item = languages_item_data.to_dict()
            languages.append(languages_item)



        style: dict[str, Any] | Unset = UNSET
        if not isinstance(self.style, Unset):
            style = self.style.to_dict()

        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()

        source: dict[str, Any] | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "spans": spans,
            "languages": languages,
        })
        if style is not UNSET:
            field_dict["style"] = style
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if source is not UNSET:
            field_dict["source"] = source

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.confidence import Confidence
        from ..models.language import Language
        from ..models.source_provenance import SourceProvenance
        from ..models.text_span import TextSpan
        from ..models.text_style import TextStyle
        d = dict(src_dict)
        id = d.pop("id")

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


        _style = d.pop("style", UNSET)
        style: TextStyle | Unset
        if isinstance(_style,  Unset):
            style = UNSET
        else:
            style = TextStyle.from_dict(_style)




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




        text_annotation = cls(
            id=id,
            spans=spans,
            languages=languages,
            style=style,
            confidence=confidence,
            source=source,
        )

        return text_annotation
