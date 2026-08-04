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
  from ..models.document_page_quality_defects_item import DocumentPageQualityDefectsItem
  from ..models.document_page_quality_metrics_item import DocumentPageQualityMetricsItem





T = TypeVar("T", bound="DocumentPageQuality")



@_attrs_define
class DocumentPageQuality:
    """
        Attributes:
            defects (list[DocumentPageQualityDefectsItem]):
            metrics (list[DocumentPageQualityMetricsItem]):
            score (Confidence | Unset):
     """

    defects: list[DocumentPageQualityDefectsItem]
    metrics: list[DocumentPageQualityMetricsItem]
    score: Confidence | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.confidence import Confidence
        from ..models.document_page_quality_defects_item import DocumentPageQualityDefectsItem
        from ..models.document_page_quality_metrics_item import DocumentPageQualityMetricsItem
        defects = []
        for defects_item_data in self.defects:
            defects_item = defects_item_data.to_dict()
            defects.append(defects_item)



        metrics = []
        for metrics_item_data in self.metrics:
            metrics_item = metrics_item_data.to_dict()
            metrics.append(metrics_item)



        score: dict[str, Any] | Unset = UNSET
        if not isinstance(self.score, Unset):
            score = self.score.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "defects": defects,
            "metrics": metrics,
        })
        if score is not UNSET:
            field_dict["score"] = score

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.confidence import Confidence
        from ..models.document_page_quality_defects_item import DocumentPageQualityDefectsItem
        from ..models.document_page_quality_metrics_item import DocumentPageQualityMetricsItem
        d = dict(src_dict)
        defects = []
        _defects = d.pop("defects")
        for defects_item_data in (_defects):
            defects_item = DocumentPageQualityDefectsItem.from_dict(defects_item_data)



            defects.append(defects_item)


        metrics = []
        _metrics = d.pop("metrics")
        for metrics_item_data in (_metrics):
            metrics_item = DocumentPageQualityMetricsItem.from_dict(metrics_item_data)



            metrics.append(metrics_item)


        _score = d.pop("score", UNSET)
        score: Confidence | Unset
        if isinstance(_score,  Unset):
            score = UNSET
        else:
            score = Confidence.from_dict(_score)




        document_page_quality = cls(
            defects=defects,
            metrics=metrics,
            score=score,
        )

        return document_page_quality
