from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.confidence_scope import ConfidenceScope
from ..models.confidence_source_scale import ConfidenceSourceScale
from ..types import UNSET, Unset






T = TypeVar("T", bound="Confidence")



@_attrs_define
class Confidence:
    """
        Attributes:
            score (float):
            scope (ConfidenceScope):
            calibrated (bool):  Default: False.
            source_value (float | Unset):
            source_scale (ConfidenceSourceScale | Unset):
     """

    score: float
    scope: ConfidenceScope
    calibrated: bool = False
    source_value: float | Unset = UNSET
    source_scale: ConfidenceSourceScale | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        score = self.score

        scope = self.scope.value

        calibrated = self.calibrated

        source_value = self.source_value

        source_scale: str | Unset = UNSET
        if not isinstance(self.source_scale, Unset):
            source_scale = self.source_scale.value



        field_dict: dict[str, Any] = {}

        field_dict.update({
            "score": score,
            "scope": scope,
            "calibrated": calibrated,
        })
        if source_value is not UNSET:
            field_dict["source_value"] = source_value
        if source_scale is not UNSET:
            field_dict["source_scale"] = source_scale

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        score = d.pop("score")

        scope = ConfidenceScope(d.pop("scope"))




        calibrated = d.pop("calibrated")

        source_value = d.pop("source_value", UNSET)

        _source_scale = d.pop("source_scale", UNSET)
        source_scale: ConfidenceSourceScale | Unset
        if isinstance(_source_scale,  Unset):
            source_scale = UNSET
        else:
            source_scale = ConfidenceSourceScale(_source_scale)




        confidence = cls(
            score=score,
            scope=scope,
            calibrated=calibrated,
            source_value=source_value,
            source_scale=source_scale,
        )

        return confidence
