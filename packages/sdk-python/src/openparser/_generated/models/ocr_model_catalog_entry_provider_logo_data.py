from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
  from ..models.ocr_model_catalog_entry_provider_logo_data_paths_item import OcrModelCatalogEntryProviderLogoDataPathsItem





T = TypeVar("T", bound="OcrModelCatalogEntryProviderLogoData")



@_attrs_define
class OcrModelCatalogEntryProviderLogoData:
    """
        Attributes:
            title (str):
            view_box (str):
            paths (list[OcrModelCatalogEntryProviderLogoDataPathsItem]):
     """

    title: str
    view_box: str
    paths: list[OcrModelCatalogEntryProviderLogoDataPathsItem]





    def to_dict(self) -> dict[str, Any]:
        from ..models.ocr_model_catalog_entry_provider_logo_data_paths_item import OcrModelCatalogEntryProviderLogoDataPathsItem
        title = self.title

        view_box = self.view_box

        paths = []
        for paths_item_data in self.paths:
            paths_item = paths_item_data.to_dict()
            paths.append(paths_item)




        field_dict: dict[str, Any] = {}

        field_dict.update({
            "title": title,
            "view_box": view_box,
            "paths": paths,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ocr_model_catalog_entry_provider_logo_data_paths_item import OcrModelCatalogEntryProviderLogoDataPathsItem
        d = dict(src_dict)
        title = d.pop("title")

        view_box = d.pop("view_box")

        paths = []
        _paths = d.pop("paths")
        for paths_item_data in (_paths):
            paths_item = OcrModelCatalogEntryProviderLogoDataPathsItem.from_dict(paths_item_data)



            paths.append(paths_item)


        ocr_model_catalog_entry_provider_logo_data = cls(
            title=title,
            view_box=view_box,
            paths=paths,
        )

        return ocr_model_catalog_entry_provider_logo_data
