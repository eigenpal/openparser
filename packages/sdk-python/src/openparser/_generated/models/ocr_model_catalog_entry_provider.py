from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.ocr_model_catalog_entry_provider_logo_data import OcrModelCatalogEntryProviderLogoData





T = TypeVar("T", bound="OcrModelCatalogEntryProvider")



@_attrs_define
class OcrModelCatalogEntryProvider:
    """
        Attributes:
            key (str):
            label (str):
            logo (str | Unset):
            logo_data (OcrModelCatalogEntryProviderLogoData | Unset):
     """

    key: str
    label: str
    logo: str | Unset = UNSET
    logo_data: OcrModelCatalogEntryProviderLogoData | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.ocr_model_catalog_entry_provider_logo_data import OcrModelCatalogEntryProviderLogoData
        key = self.key

        label = self.label

        logo = self.logo

        logo_data: dict[str, Any] | Unset = UNSET
        if not isinstance(self.logo_data, Unset):
            logo_data = self.logo_data.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "key": key,
            "label": label,
        })
        if logo is not UNSET:
            field_dict["logo"] = logo
        if logo_data is not UNSET:
            field_dict["logo_data"] = logo_data

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ocr_model_catalog_entry_provider_logo_data import OcrModelCatalogEntryProviderLogoData
        d = dict(src_dict)
        key = d.pop("key")

        label = d.pop("label")

        logo = d.pop("logo", UNSET)

        _logo_data = d.pop("logo_data", UNSET)
        logo_data: OcrModelCatalogEntryProviderLogoData | Unset
        if isinstance(_logo_data,  Unset):
            logo_data = UNSET
        else:
            logo_data = OcrModelCatalogEntryProviderLogoData.from_dict(_logo_data)




        ocr_model_catalog_entry_provider = cls(
            key=key,
            label=label,
            logo=logo,
            logo_data=logo_data,
        )

        return ocr_model_catalog_entry_provider
