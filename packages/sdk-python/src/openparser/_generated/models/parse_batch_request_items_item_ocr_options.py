from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="ParseBatchRequestItemsItemOcrOptions")



@_attrs_define
class ParseBatchRequestItemsItemOcrOptions:
    """
        Attributes:
            image_block_ocr (bool | Unset):
            chart_recognition (bool | Unset):
            merge_layout_blocks (bool | Unset): Merge nearby cross-column or staggered text regions before recognition.
                Defaults to false to preserve one-to-one text and bounding-box alignment.
     """

    image_block_ocr: bool | Unset = UNSET
    chart_recognition: bool | Unset = UNSET
    merge_layout_blocks: bool | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        image_block_ocr = self.image_block_ocr

        chart_recognition = self.chart_recognition

        merge_layout_blocks = self.merge_layout_blocks


        field_dict: dict[str, Any] = {}

        field_dict.update({
        })
        if image_block_ocr is not UNSET:
            field_dict["image_block_ocr"] = image_block_ocr
        if chart_recognition is not UNSET:
            field_dict["chart_recognition"] = chart_recognition
        if merge_layout_blocks is not UNSET:
            field_dict["merge_layout_blocks"] = merge_layout_blocks

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        image_block_ocr = d.pop("image_block_ocr", UNSET)

        chart_recognition = d.pop("chart_recognition", UNSET)

        merge_layout_blocks = d.pop("merge_layout_blocks", UNSET)

        parse_batch_request_items_item_ocr_options = cls(
            image_block_ocr=image_block_ocr,
            chart_recognition=chart_recognition,
            merge_layout_blocks=merge_layout_blocks,
        )

        return parse_batch_request_items_item_ocr_options
