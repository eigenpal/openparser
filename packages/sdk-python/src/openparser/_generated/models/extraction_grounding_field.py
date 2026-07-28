from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.extraction_citation import ExtractionCitation





T = TypeVar("T", bound="ExtractionGroundingField")



@_attrs_define
class ExtractionGroundingField:
    """ Grounding metadata for one leaf in the unwrapped extraction output. `path` uses
    dot-separated property segments and decimal array-index segments, for example
    `line_items.0.amount`.

        Attributes:
            path (str): Dot-separated path from the output root. Array positions are decimal segments.
                Property names containing dots are outside the field-grounding schema subset.
            citations (list[ExtractionCitation]):
            dropped_source_ids (list[str] | Unset):
     """

    path: str
    citations: list[ExtractionCitation]
    dropped_source_ids: list[str] | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.extraction_citation import ExtractionCitation
        path = self.path

        citations = []
        for citations_item_data in self.citations:
            citations_item = citations_item_data.to_dict()
            citations.append(citations_item)



        dropped_source_ids: list[str] | Unset = UNSET
        if not isinstance(self.dropped_source_ids, Unset):
            dropped_source_ids = self.dropped_source_ids




        field_dict: dict[str, Any] = {}

        field_dict.update({
            "path": path,
            "citations": citations,
        })
        if dropped_source_ids is not UNSET:
            field_dict["dropped_source_ids"] = dropped_source_ids

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.extraction_citation import ExtractionCitation
        d = dict(src_dict)
        path = d.pop("path")

        citations = []
        _citations = d.pop("citations")
        for citations_item_data in (_citations):
            citations_item = ExtractionCitation.from_dict(citations_item_data)



            citations.append(citations_item)


        dropped_source_ids = cast(list[str], d.pop("dropped_source_ids", UNSET))


        extraction_grounding_field = cls(
            path=path,
            citations=citations,
            dropped_source_ids=dropped_source_ids,
        )

        return extraction_grounding_field
