from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="OcrModelCatalogEntryProvider")



@_attrs_define
class OcrModelCatalogEntryProvider:
    """
        Attributes:
            key (str):
            label (str):
            logo (str | Unset):
     """

    key: str
    label: str
    logo: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        key = self.key

        label = self.label

        logo = self.logo


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "key": key,
            "label": label,
        })
        if logo is not UNSET:
            field_dict["logo"] = logo

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        key = d.pop("key")

        label = d.pop("label")

        logo = d.pop("logo", UNSET)

        ocr_model_catalog_entry_provider = cls(
            key=key,
            label=label,
            logo=logo,
        )

        return ocr_model_catalog_entry_provider
