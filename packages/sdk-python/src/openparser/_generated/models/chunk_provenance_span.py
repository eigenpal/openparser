from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
  from ..models.bounding_box import BoundingBox





T = TypeVar("T", bound="ChunkProvenanceSpan")



@_attrs_define
class ChunkProvenanceSpan:
    """
        Attributes:
            start_char (int):
            end_char (int):
            page_number (int):
            bbox (BoundingBox): Axis-aligned integer page coordinates with exclusive right and bottom edges.
            region_id (str):
     """

    start_char: int
    end_char: int
    page_number: int
    bbox: BoundingBox
    region_id: str





    def to_dict(self) -> dict[str, Any]:
        from ..models.bounding_box import BoundingBox
        start_char = self.start_char

        end_char = self.end_char

        page_number = self.page_number

        bbox = self.bbox.to_dict()

        region_id = self.region_id


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "start_char": start_char,
            "end_char": end_char,
            "page_number": page_number,
            "bbox": bbox,
            "region_id": region_id,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.bounding_box import BoundingBox
        d = dict(src_dict)
        start_char = d.pop("start_char")

        end_char = d.pop("end_char")

        page_number = d.pop("page_number")

        bbox = BoundingBox.from_dict(d.pop("bbox"))




        region_id = d.pop("region_id")

        chunk_provenance_span = cls(
            start_char=start_char,
            end_char=end_char,
            page_number=page_number,
            bbox=bbox,
            region_id=region_id,
        )

        return chunk_provenance_span
