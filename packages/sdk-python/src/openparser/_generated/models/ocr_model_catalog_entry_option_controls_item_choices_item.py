from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="OcrModelCatalogEntryOptionControlsItemChoicesItem")



@_attrs_define
class OcrModelCatalogEntryOptionControlsItemChoicesItem:
    """
        Attributes:
            value (str):
            label (str):
     """

    value: str
    label: str





    def to_dict(self) -> dict[str, Any]:
        value = self.value

        label = self.label


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "value": value,
            "label": label,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        value = d.pop("value")

        label = d.pop("label")

        ocr_model_catalog_entry_option_controls_item_choices_item = cls(
            value=value,
            label=label,
        )

        return ocr_model_catalog_entry_option_controls_item_choices_item
