from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="PaddleRawProfileOptions")



@_attrs_define
class PaddleRawProfileOptions:
    """
        Attributes:
            format_block_content (bool):
            use_chart_recognition (bool):
            use_ocr_for_image_block (bool):
            return_markdown_images (bool):
            visualize (bool):
            image_block_ocr (bool):
            chart_recognition (bool):
            merge_layout_blocks (bool | Unset):
     """

    format_block_content: bool
    use_chart_recognition: bool
    use_ocr_for_image_block: bool
    return_markdown_images: bool
    visualize: bool
    image_block_ocr: bool
    chart_recognition: bool
    merge_layout_blocks: bool | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        format_block_content = self.format_block_content

        use_chart_recognition = self.use_chart_recognition

        use_ocr_for_image_block = self.use_ocr_for_image_block

        return_markdown_images = self.return_markdown_images

        visualize = self.visualize

        image_block_ocr = self.image_block_ocr

        chart_recognition = self.chart_recognition

        merge_layout_blocks = self.merge_layout_blocks


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "format_block_content": format_block_content,
            "use_chart_recognition": use_chart_recognition,
            "use_ocr_for_image_block": use_ocr_for_image_block,
            "return_markdown_images": return_markdown_images,
            "visualize": visualize,
            "image_block_ocr": image_block_ocr,
            "chart_recognition": chart_recognition,
        })
        if merge_layout_blocks is not UNSET:
            field_dict["merge_layout_blocks"] = merge_layout_blocks

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        format_block_content = d.pop("format_block_content")

        use_chart_recognition = d.pop("use_chart_recognition")

        use_ocr_for_image_block = d.pop("use_ocr_for_image_block")

        return_markdown_images = d.pop("return_markdown_images")

        visualize = d.pop("visualize")

        image_block_ocr = d.pop("image_block_ocr")

        chart_recognition = d.pop("chart_recognition")

        merge_layout_blocks = d.pop("merge_layout_blocks", UNSET)

        paddle_raw_profile_options = cls(
            format_block_content=format_block_content,
            use_chart_recognition=use_chart_recognition,
            use_ocr_for_image_block=use_ocr_for_image_block,
            return_markdown_images=return_markdown_images,
            visualize=visualize,
            image_block_ocr=image_block_ocr,
            chart_recognition=chart_recognition,
            merge_layout_blocks=merge_layout_blocks,
        )

        return paddle_raw_profile_options
