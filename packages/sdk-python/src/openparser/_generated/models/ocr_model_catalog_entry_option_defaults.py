from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="OcrModelCatalogEntryOptionDefaults")



@_attrs_define
class OcrModelCatalogEntryOptionDefaults:
    """
        Attributes:
            image_block_ocr (bool):
            chart_recognition (bool):
            merge_layout_blocks (bool):
     """

    image_block_ocr: bool
    chart_recognition: bool
    merge_layout_blocks: bool





    def to_dict(self) -> dict[str, Any]:
        image_block_ocr = self.image_block_ocr

        chart_recognition = self.chart_recognition

        merge_layout_blocks = self.merge_layout_blocks


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "image_block_ocr": image_block_ocr,
            "chart_recognition": chart_recognition,
            "merge_layout_blocks": merge_layout_blocks,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        image_block_ocr = d.pop("image_block_ocr")

        chart_recognition = d.pop("chart_recognition")

        merge_layout_blocks = d.pop("merge_layout_blocks")

        ocr_model_catalog_entry_option_defaults = cls(
            image_block_ocr=image_block_ocr,
            chart_recognition=chart_recognition,
            merge_layout_blocks=merge_layout_blocks,
        )

        return ocr_model_catalog_entry_option_defaults
