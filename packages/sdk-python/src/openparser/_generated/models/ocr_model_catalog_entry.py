from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.ocr_model_catalog_entry_availability import OcrModelCatalogEntryAvailability
from typing import cast

if TYPE_CHECKING:
  from ..models.ocr_model_catalog_entry_benchmark_type_0 import OcrModelCatalogEntryBenchmarkType0
  from ..models.ocr_model_catalog_entry_capabilities import OcrModelCatalogEntryCapabilities
  from ..models.ocr_model_catalog_entry_guidance import OcrModelCatalogEntryGuidance
  from ..models.ocr_model_catalog_entry_option_controls_item import OcrModelCatalogEntryOptionControlsItem
  from ..models.ocr_model_catalog_entry_option_defaults import OcrModelCatalogEntryOptionDefaults
  from ..models.ocr_model_catalog_entry_pricing import OcrModelCatalogEntryPricing
  from ..models.ocr_model_catalog_entry_provider import OcrModelCatalogEntryProvider





T = TypeVar("T", bound="OcrModelCatalogEntry")



@_attrs_define
class OcrModelCatalogEntry:
    """ Public OCR model registry entry. `pricing.usd_per_page` is the
    customer retail page price at option defaults (`basis: customer_retail`).
    Optional `pricing.configurations` lists exact named retail totals for
    price-affecting option combinations — never additive surcharges.

        Attributes:
            id (str):
            label (str):
            is_default (bool):
            provider (OcrModelCatalogEntryProvider):
            guidance (OcrModelCatalogEntryGuidance):
            benchmark (None | OcrModelCatalogEntryBenchmarkType0):
            output_summary (str):
            capabilities (OcrModelCatalogEntryCapabilities):
            option_defaults (OcrModelCatalogEntryOptionDefaults):
            option_controls (list[OcrModelCatalogEntryOptionControlsItem]):
            pricing (OcrModelCatalogEntryPricing):
            availability (OcrModelCatalogEntryAvailability):
     """

    id: str
    label: str
    is_default: bool
    provider: OcrModelCatalogEntryProvider
    guidance: OcrModelCatalogEntryGuidance
    benchmark: None | OcrModelCatalogEntryBenchmarkType0
    output_summary: str
    capabilities: OcrModelCatalogEntryCapabilities
    option_defaults: OcrModelCatalogEntryOptionDefaults
    option_controls: list[OcrModelCatalogEntryOptionControlsItem]
    pricing: OcrModelCatalogEntryPricing
    availability: OcrModelCatalogEntryAvailability





    def to_dict(self) -> dict[str, Any]:
        from ..models.ocr_model_catalog_entry_benchmark_type_0 import OcrModelCatalogEntryBenchmarkType0
        from ..models.ocr_model_catalog_entry_capabilities import OcrModelCatalogEntryCapabilities
        from ..models.ocr_model_catalog_entry_guidance import OcrModelCatalogEntryGuidance
        from ..models.ocr_model_catalog_entry_option_controls_item import OcrModelCatalogEntryOptionControlsItem
        from ..models.ocr_model_catalog_entry_option_defaults import OcrModelCatalogEntryOptionDefaults
        from ..models.ocr_model_catalog_entry_pricing import OcrModelCatalogEntryPricing
        from ..models.ocr_model_catalog_entry_provider import OcrModelCatalogEntryProvider
        id = self.id

        label = self.label

        is_default = self.is_default

        provider = self.provider.to_dict()

        guidance = self.guidance.to_dict()

        benchmark: dict[str, Any] | None
        if isinstance(self.benchmark, OcrModelCatalogEntryBenchmarkType0):
            benchmark = self.benchmark.to_dict()
        else:
            benchmark = self.benchmark

        output_summary = self.output_summary

        capabilities = self.capabilities.to_dict()

        option_defaults = self.option_defaults.to_dict()

        option_controls = []
        for option_controls_item_data in self.option_controls:
            option_controls_item = option_controls_item_data.to_dict()
            option_controls.append(option_controls_item)



        pricing = self.pricing.to_dict()

        availability = self.availability.value


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "label": label,
            "is_default": is_default,
            "provider": provider,
            "guidance": guidance,
            "benchmark": benchmark,
            "output_summary": output_summary,
            "capabilities": capabilities,
            "option_defaults": option_defaults,
            "option_controls": option_controls,
            "pricing": pricing,
            "availability": availability,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ocr_model_catalog_entry_benchmark_type_0 import OcrModelCatalogEntryBenchmarkType0
        from ..models.ocr_model_catalog_entry_capabilities import OcrModelCatalogEntryCapabilities
        from ..models.ocr_model_catalog_entry_guidance import OcrModelCatalogEntryGuidance
        from ..models.ocr_model_catalog_entry_option_controls_item import OcrModelCatalogEntryOptionControlsItem
        from ..models.ocr_model_catalog_entry_option_defaults import OcrModelCatalogEntryOptionDefaults
        from ..models.ocr_model_catalog_entry_pricing import OcrModelCatalogEntryPricing
        from ..models.ocr_model_catalog_entry_provider import OcrModelCatalogEntryProvider
        d = dict(src_dict)
        id = d.pop("id")

        label = d.pop("label")

        is_default = d.pop("is_default")

        provider = OcrModelCatalogEntryProvider.from_dict(d.pop("provider"))




        guidance = OcrModelCatalogEntryGuidance.from_dict(d.pop("guidance"))




        def _parse_benchmark(data: object) -> None | OcrModelCatalogEntryBenchmarkType0:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                benchmark_type_0 = OcrModelCatalogEntryBenchmarkType0.from_dict(data)



                return benchmark_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | OcrModelCatalogEntryBenchmarkType0, data)

        benchmark = _parse_benchmark(d.pop("benchmark"))


        output_summary = d.pop("output_summary")

        capabilities = OcrModelCatalogEntryCapabilities.from_dict(d.pop("capabilities"))




        option_defaults = OcrModelCatalogEntryOptionDefaults.from_dict(d.pop("option_defaults"))




        option_controls = []
        _option_controls = d.pop("option_controls")
        for option_controls_item_data in (_option_controls):
            option_controls_item = OcrModelCatalogEntryOptionControlsItem.from_dict(option_controls_item_data)



            option_controls.append(option_controls_item)


        pricing = OcrModelCatalogEntryPricing.from_dict(d.pop("pricing"))




        availability = OcrModelCatalogEntryAvailability(d.pop("availability"))




        ocr_model_catalog_entry = cls(
            id=id,
            label=label,
            is_default=is_default,
            provider=provider,
            guidance=guidance,
            benchmark=benchmark,
            output_summary=output_summary,
            capabilities=capabilities,
            option_defaults=option_defaults,
            option_controls=option_controls,
            pricing=pricing,
            availability=availability,
        )

        return ocr_model_catalog_entry
