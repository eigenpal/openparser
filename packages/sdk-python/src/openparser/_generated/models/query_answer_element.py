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





T = TypeVar("T", bound="QueryAnswerElement")



@_attrs_define
class QueryAnswerElement:
    """
        Attributes:
            id (str):
            locations (list[Geometry]):
            kind (Literal['query_answer']):
            query (StructuredValue):
            answer (None | StructuredValue):
            confidence (Confidence | Unset):
            source (SourceProvenance | Unset):
            alias (str | Unset):
     """

    id: str
    locations: list[Geometry]
    kind: Literal['query_answer']
    query: StructuredValue
    answer: None | StructuredValue
    confidence: Confidence | Unset = UNSET
    source: SourceProvenance | Unset = UNSET
    alias: str | Unset = UNSET





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

        query = self.query.to_dict()

        answer: dict[str, Any] | None
        if isinstance(self.answer, StructuredValue):
            answer = self.answer.to_dict()
        else:
            answer = self.answer

        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()

        source: dict[str, Any] | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.to_dict()

        alias = self.alias


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "locations": locations,
            "kind": kind,
            "query": query,
            "answer": answer,
        })
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if source is not UNSET:
            field_dict["source"] = source
        if alias is not UNSET:
            field_dict["alias"] = alias

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


        kind = cast(Literal['query_answer'] , d.pop("kind"))
        if kind != 'query_answer':
            raise ValueError(f"kind must match const 'query_answer', got '{kind}'")

        query = StructuredValue.from_dict(d.pop("query"))




        def _parse_answer(data: object) -> None | StructuredValue:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                answer_type_0 = StructuredValue.from_dict(data)



                return answer_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | StructuredValue, data)

        answer = _parse_answer(d.pop("answer"))


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




        alias = d.pop("alias", UNSET)

        query_answer_element = cls(
            id=id,
            locations=locations,
            kind=kind,
            query=query,
            answer=answer,
            confidence=confidence,
            source=source,
            alias=alias,
        )

        return query_answer_element
