from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
  from ..models.ocr_model_catalog_entry_pricing_configurations_item_options import OcrModelCatalogEntryPricingConfigurationsItemOptions





T = TypeVar("T", bound="OcrModelCatalogEntryPricingConfigurationsItem")



@_attrs_define
class OcrModelCatalogEntryPricingConfigurationsItem:
    """
        Attributes:
            label (str):
            usd_per_page (float):
            options (OcrModelCatalogEntryPricingConfigurationsItemOptions):
     """

    label: str
    usd_per_page: float
    options: OcrModelCatalogEntryPricingConfigurationsItemOptions





    def to_dict(self) -> dict[str, Any]:
        from ..models.ocr_model_catalog_entry_pricing_configurations_item_options import OcrModelCatalogEntryPricingConfigurationsItemOptions
        label = self.label

        usd_per_page = self.usd_per_page

        options = self.options.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "label": label,
            "usd_per_page": usd_per_page,
            "options": options,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ocr_model_catalog_entry_pricing_configurations_item_options import OcrModelCatalogEntryPricingConfigurationsItemOptions
        d = dict(src_dict)
        label = d.pop("label")

        usd_per_page = d.pop("usd_per_page")

        options = OcrModelCatalogEntryPricingConfigurationsItemOptions.from_dict(d.pop("options"))




        ocr_model_catalog_entry_pricing_configurations_item = cls(
            label=label,
            usd_per_page=usd_per_page,
            options=options,
        )

        return ocr_model_catalog_entry_pricing_configurations_item
