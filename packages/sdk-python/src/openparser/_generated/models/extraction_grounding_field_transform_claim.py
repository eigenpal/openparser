from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.extraction_grounding_field_transform_claim_confidence import ExtractionGroundingFieldTransformClaimConfidence
from ..models.extraction_grounding_field_transform_claim_operation import ExtractionGroundingFieldTransformClaimOperation
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.extraction_grounding_field_transform_claim_parameters import ExtractionGroundingFieldTransformClaimParameters





T = TypeVar("T", bound="ExtractionGroundingFieldTransformClaim")



@_attrs_define
class ExtractionGroundingFieldTransformClaim:
    """ The model's bounded report of a rewrite: operation, parameters, reason, and optional
    low/medium/high ordinal confidence. The claim is untrusted and never authorizes a
    deterministic validator; only explicit request/schema intent can do that.

        Attributes:
            operation (ExtractionGroundingFieldTransformClaimOperation):
            parameters (ExtractionGroundingFieldTransformClaimParameters):
            reason (str):
            confidence (ExtractionGroundingFieldTransformClaimConfidence | Unset):
     """

    operation: ExtractionGroundingFieldTransformClaimOperation
    parameters: ExtractionGroundingFieldTransformClaimParameters
    reason: str
    confidence: ExtractionGroundingFieldTransformClaimConfidence | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.extraction_grounding_field_transform_claim_parameters import ExtractionGroundingFieldTransformClaimParameters
        operation = self.operation.value

        parameters = self.parameters.to_dict()

        reason = self.reason

        confidence: str | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.value



        field_dict: dict[str, Any] = {}

        field_dict.update({
            "operation": operation,
            "parameters": parameters,
            "reason": reason,
        })
        if confidence is not UNSET:
            field_dict["confidence"] = confidence

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.extraction_grounding_field_transform_claim_parameters import ExtractionGroundingFieldTransformClaimParameters
        d = dict(src_dict)
        operation = ExtractionGroundingFieldTransformClaimOperation(d.pop("operation"))




        parameters = ExtractionGroundingFieldTransformClaimParameters.from_dict(d.pop("parameters"))




        reason = d.pop("reason")

        _confidence = d.pop("confidence", UNSET)
        confidence: ExtractionGroundingFieldTransformClaimConfidence | Unset
        if isinstance(_confidence,  Unset):
            confidence = UNSET
        else:
            confidence = ExtractionGroundingFieldTransformClaimConfidence(_confidence)




        extraction_grounding_field_transform_claim = cls(
            operation=operation,
            parameters=parameters,
            reason=reason,
            confidence=confidence,
        )

        return extraction_grounding_field_transform_claim
