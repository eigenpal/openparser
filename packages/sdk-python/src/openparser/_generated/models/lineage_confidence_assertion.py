from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.lineage_confidence_assertion_kind import LineageConfidenceAssertionKind
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.lineage_confidence_assertion_attributes import LineageConfidenceAssertionAttributes
  from ..models.lineage_confidence_assertion_sources_item import LineageConfidenceAssertionSourcesItem
  from ..models.lineage_confidence_scale import LineageConfidenceScale





T = TypeVar("T", bound="LineageConfidenceAssertion")



@_attrs_define
class LineageConfidenceAssertion:
    """ A score with an explicit numeric scale, scope, granularity, calibration status, and provenance. Scores from
    different scopes or providers are not interchangeable probabilities.

        Attributes:
            score (float):
            scale (LineageConfidenceScale):
            kind (LineageConfidenceAssertionKind):
            scope (str):
            calibrated (bool):  Default: False.
            granularity (str | Unset):
            sources (list[LineageConfidenceAssertionSourcesItem] | Unset):
            method (str | Unset):
            sample_count (int | Unset):
            attributes (LineageConfidenceAssertionAttributes | Unset):
     """

    score: float
    scale: LineageConfidenceScale
    kind: LineageConfidenceAssertionKind
    scope: str
    calibrated: bool = False
    granularity: str | Unset = UNSET
    sources: list[LineageConfidenceAssertionSourcesItem] | Unset = UNSET
    method: str | Unset = UNSET
    sample_count: int | Unset = UNSET
    attributes: LineageConfidenceAssertionAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_confidence_assertion_attributes import LineageConfidenceAssertionAttributes
        from ..models.lineage_confidence_assertion_sources_item import LineageConfidenceAssertionSourcesItem
        from ..models.lineage_confidence_scale import LineageConfidenceScale
        score = self.score

        scale = self.scale.to_dict()

        kind = self.kind.value

        scope = self.scope

        calibrated = self.calibrated

        granularity = self.granularity

        sources: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.sources, Unset):
            sources = []
            for sources_item_data in self.sources:
                sources_item = sources_item_data.to_dict()
                sources.append(sources_item)



        method = self.method

        sample_count = self.sample_count

        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "score": score,
            "scale": scale,
            "kind": kind,
            "scope": scope,
            "calibrated": calibrated,
        })
        if granularity is not UNSET:
            field_dict["granularity"] = granularity
        if sources is not UNSET:
            field_dict["sources"] = sources
        if method is not UNSET:
            field_dict["method"] = method
        if sample_count is not UNSET:
            field_dict["sampleCount"] = sample_count
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_confidence_assertion_attributes import LineageConfidenceAssertionAttributes
        from ..models.lineage_confidence_assertion_sources_item import LineageConfidenceAssertionSourcesItem
        from ..models.lineage_confidence_scale import LineageConfidenceScale
        d = dict(src_dict)
        score = d.pop("score")

        scale = LineageConfidenceScale.from_dict(d.pop("scale"))




        kind = LineageConfidenceAssertionKind(d.pop("kind"))




        scope = d.pop("scope")

        calibrated = d.pop("calibrated")

        granularity = d.pop("granularity", UNSET)

        _sources = d.pop("sources", UNSET)
        sources: list[LineageConfidenceAssertionSourcesItem] | Unset = UNSET
        if _sources is not UNSET:
            sources = []
            for sources_item_data in _sources:
                sources_item = LineageConfidenceAssertionSourcesItem.from_dict(sources_item_data)



                sources.append(sources_item)


        method = d.pop("method", UNSET)

        sample_count = d.pop("sampleCount", UNSET)

        _attributes = d.pop("attributes", UNSET)
        attributes: LineageConfidenceAssertionAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageConfidenceAssertionAttributes.from_dict(_attributes)




        lineage_confidence_assertion = cls(
            score=score,
            scale=scale,
            kind=kind,
            scope=scope,
            calibrated=calibrated,
            granularity=granularity,
            sources=sources,
            method=method,
            sample_count=sample_count,
            attributes=attributes,
        )

        return lineage_confidence_assertion
