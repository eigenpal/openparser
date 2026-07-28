from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import Literal, cast






T = TypeVar("T", bound="OcrLlmModelCatalogEntryPricing")



@_attrs_define
class OcrLlmModelCatalogEntryPricing:
    """
        Attributes:
            prompt_usd_per_1m (float):
            completion_usd_per_1m (float):
            basis (Literal['customer_retail']):
     """

    prompt_usd_per_1m: float
    completion_usd_per_1m: float
    basis: Literal['customer_retail']





    def to_dict(self) -> dict[str, Any]:
        prompt_usd_per_1m = self.prompt_usd_per_1m

        completion_usd_per_1m = self.completion_usd_per_1m

        basis = self.basis


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "prompt_usd_per_1m": prompt_usd_per_1m,
            "completion_usd_per_1m": completion_usd_per_1m,
            "basis": basis,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        prompt_usd_per_1m = d.pop("prompt_usd_per_1m")

        completion_usd_per_1m = d.pop("completion_usd_per_1m")

        basis = cast(Literal['customer_retail'] , d.pop("basis"))
        if basis != 'customer_retail':
            raise ValueError(f"basis must match const 'customer_retail', got '{basis}'")

        ocr_llm_model_catalog_entry_pricing = cls(
            prompt_usd_per_1m=prompt_usd_per_1m,
            completion_usd_per_1m=completion_usd_per_1m,
            basis=basis,
        )

        return ocr_llm_model_catalog_entry_pricing
