from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.lineage_derivation_input_effect import LineageDerivationInputEffect
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.lineage_confidence_assertion import LineageConfidenceAssertion
  from ..models.lineage_derivation_input_attributes import LineageDerivationInputAttributes





T = TypeVar("T", bound="LineageDerivationInput")



@_attrs_define
class LineageDerivationInput:
    """
        Attributes:
            entity (str):
            effect (LineageDerivationInputEffect):  Default: LineageDerivationInputEffect.DIRECT.
            role (str | Unset):
            confidence (LineageConfidenceAssertion | Unset): A score with an explicit numeric scale, scope, granularity,
                calibration status, and provenance. Scores from different scopes or providers are not interchangeable
                probabilities.
            attributes (LineageDerivationInputAttributes | Unset):
     """

    entity: str
    effect: LineageDerivationInputEffect = LineageDerivationInputEffect.DIRECT
    role: str | Unset = UNSET
    confidence: LineageConfidenceAssertion | Unset = UNSET
    attributes: LineageDerivationInputAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_confidence_assertion import LineageConfidenceAssertion
        from ..models.lineage_derivation_input_attributes import LineageDerivationInputAttributes
        entity = self.entity

        effect = self.effect.value

        role = self.role

        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()

        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "entity": entity,
            "effect": effect,
        })
        if role is not UNSET:
            field_dict["role"] = role
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_confidence_assertion import LineageConfidenceAssertion
        from ..models.lineage_derivation_input_attributes import LineageDerivationInputAttributes
        d = dict(src_dict)
        entity = d.pop("entity")

        effect = LineageDerivationInputEffect(d.pop("effect"))




        role = d.pop("role", UNSET)

        _confidence = d.pop("confidence", UNSET)
        confidence: LineageConfidenceAssertion | Unset
        if isinstance(_confidence,  Unset):
            confidence = UNSET
        else:
            confidence = LineageConfidenceAssertion.from_dict(_confidence)




        _attributes = d.pop("attributes", UNSET)
        attributes: LineageDerivationInputAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageDerivationInputAttributes.from_dict(_attributes)




        lineage_derivation_input = cls(
            entity=entity,
            effect=effect,
            role=role,
            confidence=confidence,
            attributes=attributes,
        )

        return lineage_derivation_input
