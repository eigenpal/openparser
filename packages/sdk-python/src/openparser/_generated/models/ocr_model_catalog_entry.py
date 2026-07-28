from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.ocr_model_catalog_entry_availability import OcrModelCatalogEntryAvailability
from typing import cast

if TYPE_CHECKING:
  from ..models.ocr_model_catalog_entry_capabilities import OcrModelCatalogEntryCapabilities
  from ..models.ocr_model_catalog_entry_option_defaults import OcrModelCatalogEntryOptionDefaults
  from ..models.ocr_model_catalog_entry_pricing import OcrModelCatalogEntryPricing





T = TypeVar("T", bound="OcrModelCatalogEntry")



@_attrs_define
class OcrModelCatalogEntry:
    """ Public OCR model registry entry. `pricing.usd_per_page` is the
    customer retail page price (`basis: customer_retail`).

        Attributes:
            id (str):
            label (str):
            is_default (bool):
            capabilities (OcrModelCatalogEntryCapabilities):
            option_defaults (OcrModelCatalogEntryOptionDefaults):
            pricing (OcrModelCatalogEntryPricing):
            availability (OcrModelCatalogEntryAvailability):
     """

    id: str
    label: str
    is_default: bool
    capabilities: OcrModelCatalogEntryCapabilities
    option_defaults: OcrModelCatalogEntryOptionDefaults
    pricing: OcrModelCatalogEntryPricing
    availability: OcrModelCatalogEntryAvailability





    def to_dict(self) -> dict[str, Any]:
        from ..models.ocr_model_catalog_entry_capabilities import OcrModelCatalogEntryCapabilities
        from ..models.ocr_model_catalog_entry_option_defaults import OcrModelCatalogEntryOptionDefaults
        from ..models.ocr_model_catalog_entry_pricing import OcrModelCatalogEntryPricing
        id = self.id

        label = self.label

        is_default = self.is_default

        capabilities = self.capabilities.to_dict()

        option_defaults = self.option_defaults.to_dict()

        pricing = self.pricing.to_dict()

        availability = self.availability.value


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "label": label,
            "is_default": is_default,
            "capabilities": capabilities,
            "option_defaults": option_defaults,
            "pricing": pricing,
            "availability": availability,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ocr_model_catalog_entry_capabilities import OcrModelCatalogEntryCapabilities
        from ..models.ocr_model_catalog_entry_option_defaults import OcrModelCatalogEntryOptionDefaults
        from ..models.ocr_model_catalog_entry_pricing import OcrModelCatalogEntryPricing
        d = dict(src_dict)
        id = d.pop("id")

        label = d.pop("label")

        is_default = d.pop("is_default")

        capabilities = OcrModelCatalogEntryCapabilities.from_dict(d.pop("capabilities"))




        option_defaults = OcrModelCatalogEntryOptionDefaults.from_dict(d.pop("option_defaults"))




        pricing = OcrModelCatalogEntryPricing.from_dict(d.pop("pricing"))




        availability = OcrModelCatalogEntryAvailability(d.pop("availability"))




        ocr_model_catalog_entry = cls(
            id=id,
            label=label,
            is_default=is_default,
            capabilities=capabilities,
            option_defaults=option_defaults,
            pricing=pricing,
            availability=availability,
        )

        return ocr_model_catalog_entry
