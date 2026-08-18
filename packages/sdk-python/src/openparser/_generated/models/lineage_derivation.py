from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.lineage_confidence_assertion import LineageConfidenceAssertion
  from ..models.lineage_derivation_attributes import LineageDerivationAttributes
  from ..models.lineage_derivation_input import LineageDerivationInput
  from ..models.lineage_transformation import LineageTransformation





T = TypeVar("T", bound="LineageDerivation")



@_attrs_define
class LineageDerivation:
    """ One explicit hyperedge: an activity generated exactly one output entity from zero or more typed input entities.

        Attributes:
            output (str):
            activity (str):
            inputs (list[LineageDerivationInput]):
            id (str | Unset):
            transformation (LineageTransformation | Unset):
            confidence (LineageConfidenceAssertion | Unset): A score with an explicit numeric scale, scope, granularity,
                calibration status, and provenance. Scores from different scopes or providers are not interchangeable
                probabilities.
            attributes (LineageDerivationAttributes | Unset):
     """

    output: str
    activity: str
    inputs: list[LineageDerivationInput]
    id: str | Unset = UNSET
    transformation: LineageTransformation | Unset = UNSET
    confidence: LineageConfidenceAssertion | Unset = UNSET
    attributes: LineageDerivationAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_confidence_assertion import LineageConfidenceAssertion
        from ..models.lineage_derivation_attributes import LineageDerivationAttributes
        from ..models.lineage_derivation_input import LineageDerivationInput
        from ..models.lineage_transformation import LineageTransformation
        output = self.output

        activity = self.activity

        inputs = []
        for inputs_item_data in self.inputs:
            inputs_item = inputs_item_data.to_dict()
            inputs.append(inputs_item)



        id = self.id

        transformation: dict[str, Any] | Unset = UNSET
        if not isinstance(self.transformation, Unset):
            transformation = self.transformation.to_dict()

        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()

        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "output": output,
            "activity": activity,
            "inputs": inputs,
        })
        if id is not UNSET:
            field_dict["id"] = id
        if transformation is not UNSET:
            field_dict["transformation"] = transformation
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_confidence_assertion import LineageConfidenceAssertion
        from ..models.lineage_derivation_attributes import LineageDerivationAttributes
        from ..models.lineage_derivation_input import LineageDerivationInput
        from ..models.lineage_transformation import LineageTransformation
        d = dict(src_dict)
        output = d.pop("output")

        activity = d.pop("activity")

        inputs = []
        _inputs = d.pop("inputs")
        for inputs_item_data in (_inputs):
            inputs_item = LineageDerivationInput.from_dict(inputs_item_data)



            inputs.append(inputs_item)


        id = d.pop("id", UNSET)

        _transformation = d.pop("transformation", UNSET)
        transformation: LineageTransformation | Unset
        if isinstance(_transformation,  Unset):
            transformation = UNSET
        else:
            transformation = LineageTransformation.from_dict(_transformation)




        _confidence = d.pop("confidence", UNSET)
        confidence: LineageConfidenceAssertion | Unset
        if isinstance(_confidence,  Unset):
            confidence = UNSET
        else:
            confidence = LineageConfidenceAssertion.from_dict(_confidence)




        _attributes = d.pop("attributes", UNSET)
        attributes: LineageDerivationAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageDerivationAttributes.from_dict(_attributes)




        lineage_derivation = cls(
            output=output,
            activity=activity,
            inputs=inputs,
            id=id,
            transformation=transformation,
            confidence=confidence,
            attributes=attributes,
        )

        return lineage_derivation
