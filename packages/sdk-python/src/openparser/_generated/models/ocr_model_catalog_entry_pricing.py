from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from typing import Literal, cast

if TYPE_CHECKING:
  from ..models.ocr_model_catalog_entry_pricing_configurations_item import OcrModelCatalogEntryPricingConfigurationsItem





T = TypeVar("T", bound="OcrModelCatalogEntryPricing")



@_attrs_define
class OcrModelCatalogEntryPricing:
    """
        Attributes:
            usd_per_page (float):
            basis (Literal['customer_retail']):
            configurations (list[OcrModelCatalogEntryPricingConfigurationsItem] | Unset):
     """

    usd_per_page: float
    basis: Literal['customer_retail']
    configurations: list[OcrModelCatalogEntryPricingConfigurationsItem] | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.ocr_model_catalog_entry_pricing_configurations_item import OcrModelCatalogEntryPricingConfigurationsItem
        usd_per_page = self.usd_per_page

        basis = self.basis

        configurations: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.configurations, Unset):
            configurations = []
            for configurations_item_data in self.configurations:
                configurations_item = configurations_item_data.to_dict()
                configurations.append(configurations_item)




        field_dict: dict[str, Any] = {}

        field_dict.update({
            "usd_per_page": usd_per_page,
            "basis": basis,
        })
        if configurations is not UNSET:
            field_dict["configurations"] = configurations

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ocr_model_catalog_entry_pricing_configurations_item import OcrModelCatalogEntryPricingConfigurationsItem
        d = dict(src_dict)
        usd_per_page = d.pop("usd_per_page")

        basis = cast(Literal['customer_retail'] , d.pop("basis"))
        if basis != 'customer_retail':
            raise ValueError(f"basis must match const 'customer_retail', got '{basis}'")

        _configurations = d.pop("configurations", UNSET)
        configurations: list[OcrModelCatalogEntryPricingConfigurationsItem] | Unset = UNSET
        if _configurations is not UNSET:
            configurations = []
            for configurations_item_data in _configurations:
                configurations_item = OcrModelCatalogEntryPricingConfigurationsItem.from_dict(configurations_item_data)



                configurations.append(configurations_item)


        ocr_model_catalog_entry_pricing = cls(
            usd_per_page=usd_per_page,
            basis=basis,
            configurations=configurations,
        )

        return ocr_model_catalog_entry_pricing
