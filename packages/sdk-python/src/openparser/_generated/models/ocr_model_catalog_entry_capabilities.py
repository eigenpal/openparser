from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
  from ..models.ocr_model_catalog_entry_capabilities_options import OcrModelCatalogEntryCapabilitiesOptions





T = TypeVar("T", bound="OcrModelCatalogEntryCapabilities")



@_attrs_define
class OcrModelCatalogEntryCapabilities:
    """
        Attributes:
            parse (bool):
            extract_source (bool):
            markdown (bool):
            regions (bool):
            options (OcrModelCatalogEntryCapabilitiesOptions):
     """

    parse: bool
    extract_source: bool
    markdown: bool
    regions: bool
    options: OcrModelCatalogEntryCapabilitiesOptions





    def to_dict(self) -> dict[str, Any]:
        from ..models.ocr_model_catalog_entry_capabilities_options import OcrModelCatalogEntryCapabilitiesOptions
        parse = self.parse

        extract_source = self.extract_source

        markdown = self.markdown

        regions = self.regions

        options = self.options.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "parse": parse,
            "extract_source": extract_source,
            "markdown": markdown,
            "regions": regions,
            "options": options,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ocr_model_catalog_entry_capabilities_options import OcrModelCatalogEntryCapabilitiesOptions
        d = dict(src_dict)
        parse = d.pop("parse")

        extract_source = d.pop("extract_source")

        markdown = d.pop("markdown")

        regions = d.pop("regions")

        options = OcrModelCatalogEntryCapabilitiesOptions.from_dict(d.pop("options"))




        ocr_model_catalog_entry_capabilities = cls(
            parse=parse,
            extract_source=extract_source,
            markdown=markdown,
            regions=regions,
            options=options,
        )

        return ocr_model_catalog_entry_capabilities
