from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.extraction_attempt_kind import ExtractionAttemptKind
from ..models.extraction_attempt_status import ExtractionAttemptStatus
from ..types import UNSET, Unset






T = TypeVar("T", bound="ExtractionAttempt")



@_attrs_define
class ExtractionAttempt:
    """
        Attributes:
            index (int): Zero-based attempt index in execution order.
            kind (ExtractionAttemptKind):
            llm_model (str): OpenRouter model slug from the compatible OCR extraction catalog
                (`GET /models/llm`). Unknown or deprecated values return `422 unsupported_llm_model`.
                Ordinary extract may use any currently compatible model; field grounding requires a
                certified model.
                 Example: openai/gpt-5.6-terra.
            status (ExtractionAttemptStatus):
            input_tokens (int | Unset):
            output_tokens (int | Unset):
            cost_usd (float | Unset): Customer retail USD for this attempt (OpenRouter provider cost converted to the
                rates customers are charged). Distinct from the OCR page charge.
     """

    index: int
    kind: ExtractionAttemptKind
    llm_model: str
    status: ExtractionAttemptStatus
    input_tokens: int | Unset = UNSET
    output_tokens: int | Unset = UNSET
    cost_usd: float | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        index = self.index

        kind = self.kind.value

        llm_model = self.llm_model

        status = self.status.value

        input_tokens = self.input_tokens

        output_tokens = self.output_tokens

        cost_usd = self.cost_usd


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "index": index,
            "kind": kind,
            "llm_model": llm_model,
            "status": status,
        })
        if input_tokens is not UNSET:
            field_dict["input_tokens"] = input_tokens
        if output_tokens is not UNSET:
            field_dict["output_tokens"] = output_tokens
        if cost_usd is not UNSET:
            field_dict["cost_usd"] = cost_usd

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        index = d.pop("index")

        kind = ExtractionAttemptKind(d.pop("kind"))




        llm_model = d.pop("llm_model")

        status = ExtractionAttemptStatus(d.pop("status"))




        input_tokens = d.pop("input_tokens", UNSET)

        output_tokens = d.pop("output_tokens", UNSET)

        cost_usd = d.pop("cost_usd", UNSET)

        extraction_attempt = cls(
            index=index,
            kind=kind,
            llm_model=llm_model,
            status=status,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost_usd,
        )

        return extraction_attempt
