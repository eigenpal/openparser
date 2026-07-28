from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import Literal, cast






T = TypeVar("T", bound="OcrModelCatalogEntryPricing")



@_attrs_define
class OcrModelCatalogEntryPricing:
    """
        Attributes:
            usd_per_page (float):
            basis (Literal['customer_retail']):
     """

    usd_per_page: float
    basis: Literal['customer_retail']





    def to_dict(self) -> dict[str, Any]:
        usd_per_page = self.usd_per_page

        basis = self.basis


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "usd_per_page": usd_per_page,
            "basis": basis,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        usd_per_page = d.pop("usd_per_page")

        basis = cast(Literal['customer_retail'] , d.pop("basis"))
        if basis != 'customer_retail':
            raise ValueError(f"basis must match const 'customer_retail', got '{basis}'")

        ocr_model_catalog_entry_pricing = cls(
            usd_per_page=usd_per_page,
            basis=basis,
        )

        return ocr_model_catalog_entry_pricing
