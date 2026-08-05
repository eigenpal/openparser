from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.ocr_model_catalog_entry_provider_logo_data_paths_item_clip_rule import OcrModelCatalogEntryProviderLogoDataPathsItemClipRule
from ..types import UNSET, Unset






T = TypeVar("T", bound="OcrModelCatalogEntryProviderLogoDataPathsItem")



@_attrs_define
class OcrModelCatalogEntryProviderLogoDataPathsItem:
    """
        Attributes:
            d (str):
            clip_rule (OcrModelCatalogEntryProviderLogoDataPathsItemClipRule | Unset):
            fill_opacity (str | Unset):
     """

    d: str
    clip_rule: OcrModelCatalogEntryProviderLogoDataPathsItemClipRule | Unset = UNSET
    fill_opacity: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        d = self.d

        clip_rule: str | Unset = UNSET
        if not isinstance(self.clip_rule, Unset):
            clip_rule = self.clip_rule.value


        fill_opacity = self.fill_opacity


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "d": d,
        })
        if clip_rule is not UNSET:
            field_dict["clip_rule"] = clip_rule
        if fill_opacity is not UNSET:
            field_dict["fill_opacity"] = fill_opacity

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        d = d.pop("d")

        _clip_rule = d.pop("clip_rule", UNSET)
        clip_rule: OcrModelCatalogEntryProviderLogoDataPathsItemClipRule | Unset
        if isinstance(_clip_rule,  Unset):
            clip_rule = UNSET
        else:
            clip_rule = OcrModelCatalogEntryProviderLogoDataPathsItemClipRule(_clip_rule)




        fill_opacity = d.pop("fill_opacity", UNSET)

        ocr_model_catalog_entry_provider_logo_data_paths_item = cls(
            d=d,
            clip_rule=clip_rule,
            fill_opacity=fill_opacity,
        )

        return ocr_model_catalog_entry_provider_logo_data_paths_item
