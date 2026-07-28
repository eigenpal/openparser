from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="ExtractionUsageTotals")



@_attrs_define
class ExtractionUsageTotals:
    """ Aggregated customer retail OpenRouter usage for transparency. `cost_usd` is the
    customer charge, not raw provider list cost. Distinct from the customer
    USD $0.001/page (0.1 credits/page) OCR charge recorded by Eigenpal billing.

        Attributes:
            input_tokens (int | Unset):
            output_tokens (int | Unset):
            cost_usd (float | Unset):
     """

    input_tokens: int | Unset = UNSET
    output_tokens: int | Unset = UNSET
    cost_usd: float | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        input_tokens = self.input_tokens

        output_tokens = self.output_tokens

        cost_usd = self.cost_usd


        field_dict: dict[str, Any] = {}

        field_dict.update({
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
        input_tokens = d.pop("input_tokens", UNSET)

        output_tokens = d.pop("output_tokens", UNSET)

        cost_usd = d.pop("cost_usd", UNSET)

        extraction_usage_totals = cls(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost_usd,
        )

        return extraction_usage_totals
