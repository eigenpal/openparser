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
  from ..models.extraction_grounding_field_transform_claim import ExtractionGroundingFieldTransformClaim





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
            confidence (float | Unset): The model's own confidence in this value, 0 to 1, when it reported one. This is a
                self-report, not a calibrated probability, and lineage keeps it labelled as such.
                Omitted when the model reported nothing.
            reason (str | Unset): One or two sentences from the model explaining why the quote is the source for this
                value: what in the document identifies it. This covers the read only; a rewrite is
                reported separately in `transform_claim`. Omitted when none was recorded.
            quote (str | Unset): The span of document text the model says this value was read from, copied verbatim.
                Useful when the value was reformatted and so cannot be found in the document as
                written. Like `reason` this is the model's own report. Omitted when none was recorded.
            transform_claim (ExtractionGroundingFieldTransformClaim | Unset): The model's bounded report of a rewrite:
                operation, parameters, reason, and optional
                low/medium/high ordinal confidence. The claim is untrusted and never authorizes a
                deterministic validator; only explicit request/schema intent can do that.
     """

    path: str
    citations: list[ExtractionCitation]
    dropped_source_ids: list[str] | Unset = UNSET
    confidence: float | Unset = UNSET
    reason: str | Unset = UNSET
    quote: str | Unset = UNSET
    transform_claim: ExtractionGroundingFieldTransformClaim | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.extraction_citation import ExtractionCitation
        from ..models.extraction_grounding_field_transform_claim import ExtractionGroundingFieldTransformClaim
        path = self.path

        citations = []
        for citations_item_data in self.citations:
            citations_item = citations_item_data.to_dict()
            citations.append(citations_item)



        dropped_source_ids: list[str] | Unset = UNSET
        if not isinstance(self.dropped_source_ids, Unset):
            dropped_source_ids = self.dropped_source_ids



        confidence = self.confidence

        reason = self.reason

        quote = self.quote

        transform_claim: dict[str, Any] | Unset = UNSET
        if not isinstance(self.transform_claim, Unset):
            transform_claim = self.transform_claim.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "path": path,
            "citations": citations,
        })
        if dropped_source_ids is not UNSET:
            field_dict["dropped_source_ids"] = dropped_source_ids
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if reason is not UNSET:
            field_dict["reason"] = reason
        if quote is not UNSET:
            field_dict["quote"] = quote
        if transform_claim is not UNSET:
            field_dict["transform_claim"] = transform_claim

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.extraction_citation import ExtractionCitation
        from ..models.extraction_grounding_field_transform_claim import ExtractionGroundingFieldTransformClaim
        d = dict(src_dict)
        path = d.pop("path")

        citations = []
        _citations = d.pop("citations")
        for citations_item_data in (_citations):
            citations_item = ExtractionCitation.from_dict(citations_item_data)



            citations.append(citations_item)


        dropped_source_ids = cast(list[str], d.pop("dropped_source_ids", UNSET))


        confidence = d.pop("confidence", UNSET)

        reason = d.pop("reason", UNSET)

        quote = d.pop("quote", UNSET)

        _transform_claim = d.pop("transform_claim", UNSET)
        transform_claim: ExtractionGroundingFieldTransformClaim | Unset
        if isinstance(_transform_claim,  Unset):
            transform_claim = UNSET
        else:
            transform_claim = ExtractionGroundingFieldTransformClaim.from_dict(_transform_claim)




        extraction_grounding_field = cls(
            path=path,
            citations=citations,
            dropped_source_ids=dropped_source_ids,
            confidence=confidence,
            reason=reason,
            quote=quote,
            transform_claim=transform_claim,
        )

        return extraction_grounding_field
