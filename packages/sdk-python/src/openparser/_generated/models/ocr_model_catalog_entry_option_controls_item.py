from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.ocr_model_catalog_entry_option_controls_item_kind import OcrModelCatalogEntryOptionControlsItemKind
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.ocr_model_catalog_entry_option_controls_item_choices_item import OcrModelCatalogEntryOptionControlsItemChoicesItem





T = TypeVar("T", bound="OcrModelCatalogEntryOptionControlsItem")



@_attrs_define
class OcrModelCatalogEntryOptionControlsItem:
    """
        Attributes:
            key (str):
            label (str):
            summary (str):
            kind (OcrModelCatalogEntryOptionControlsItemKind):
            choices (list[OcrModelCatalogEntryOptionControlsItemChoicesItem] | Unset):
            placeholder (str | Unset):
            nullable_sentinel (str | Unset):
     """

    key: str
    label: str
    summary: str
    kind: OcrModelCatalogEntryOptionControlsItemKind
    choices: list[OcrModelCatalogEntryOptionControlsItemChoicesItem] | Unset = UNSET
    placeholder: str | Unset = UNSET
    nullable_sentinel: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.ocr_model_catalog_entry_option_controls_item_choices_item import OcrModelCatalogEntryOptionControlsItemChoicesItem
        key = self.key

        label = self.label

        summary = self.summary

        kind = self.kind.value

        choices: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.choices, Unset):
            choices = []
            for choices_item_data in self.choices:
                choices_item = choices_item_data.to_dict()
                choices.append(choices_item)



        placeholder = self.placeholder

        nullable_sentinel = self.nullable_sentinel


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "key": key,
            "label": label,
            "summary": summary,
            "kind": kind,
        })
        if choices is not UNSET:
            field_dict["choices"] = choices
        if placeholder is not UNSET:
            field_dict["placeholder"] = placeholder
        if nullable_sentinel is not UNSET:
            field_dict["nullable_sentinel"] = nullable_sentinel

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ocr_model_catalog_entry_option_controls_item_choices_item import OcrModelCatalogEntryOptionControlsItemChoicesItem
        d = dict(src_dict)
        key = d.pop("key")

        label = d.pop("label")

        summary = d.pop("summary")

        kind = OcrModelCatalogEntryOptionControlsItemKind(d.pop("kind"))




        _choices = d.pop("choices", UNSET)
        choices: list[OcrModelCatalogEntryOptionControlsItemChoicesItem] | Unset = UNSET
        if _choices is not UNSET:
            choices = []
            for choices_item_data in _choices:
                choices_item = OcrModelCatalogEntryOptionControlsItemChoicesItem.from_dict(choices_item_data)



                choices.append(choices_item)


        placeholder = d.pop("placeholder", UNSET)

        nullable_sentinel = d.pop("nullable_sentinel", UNSET)

        ocr_model_catalog_entry_option_controls_item = cls(
            key=key,
            label=label,
            summary=summary,
            kind=kind,
            choices=choices,
            placeholder=placeholder,
            nullable_sentinel=nullable_sentinel,
        )

        return ocr_model_catalog_entry_option_controls_item
