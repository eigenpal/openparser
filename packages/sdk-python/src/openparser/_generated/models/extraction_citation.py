from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.extraction_citation_granularity import ExtractionCitationGranularity
from ..models.extraction_citation_source_type import ExtractionCitationSourceType
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.bounding_box import BoundingBox





T = TypeVar("T", bound="ExtractionCitation")



@_attrs_define
class ExtractionCitation:
    """ Verified provenance for one extracted leaf citation. Geometry comes from the parse, never the model.

        Attributes:
            block_index (int):
            page_number (int):
            bbox (BoundingBox): Axis-aligned integer page coordinates with exclusive right and bottom edges.
            source_type (ExtractionCitationSourceType):
            granularity (ExtractionCitationGranularity): Citation geometry granularity. Citation v1 emits only `block`;
                `region` is reserved
                for a later narrowing release.
            region_id (str | Unset):
            coordinate_width (int | None | Unset):
            coordinate_height (int | None | Unset):
            confidence (float | Unset):
     """

    block_index: int
    page_number: int
    bbox: BoundingBox
    source_type: ExtractionCitationSourceType
    granularity: ExtractionCitationGranularity
    region_id: str | Unset = UNSET
    coordinate_width: int | None | Unset = UNSET
    coordinate_height: int | None | Unset = UNSET
    confidence: float | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.bounding_box import BoundingBox
        block_index = self.block_index

        page_number = self.page_number

        bbox = self.bbox.to_dict()

        source_type = self.source_type.value

        granularity = self.granularity.value

        region_id = self.region_id

        coordinate_width: int | None | Unset
        if isinstance(self.coordinate_width, Unset):
            coordinate_width = UNSET
        else:
            coordinate_width = self.coordinate_width

        coordinate_height: int | None | Unset
        if isinstance(self.coordinate_height, Unset):
            coordinate_height = UNSET
        else:
            coordinate_height = self.coordinate_height

        confidence = self.confidence


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "block_index": block_index,
            "page_number": page_number,
            "bbox": bbox,
            "source_type": source_type,
            "granularity": granularity,
        })
        if region_id is not UNSET:
            field_dict["region_id"] = region_id
        if coordinate_width is not UNSET:
            field_dict["coordinate_width"] = coordinate_width
        if coordinate_height is not UNSET:
            field_dict["coordinate_height"] = coordinate_height
        if confidence is not UNSET:
            field_dict["confidence"] = confidence

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.bounding_box import BoundingBox
        d = dict(src_dict)
        block_index = d.pop("block_index")

        page_number = d.pop("page_number")

        bbox = BoundingBox.from_dict(d.pop("bbox"))




        source_type = ExtractionCitationSourceType(d.pop("source_type"))




        granularity = ExtractionCitationGranularity(d.pop("granularity"))




        region_id = d.pop("region_id", UNSET)

        def _parse_coordinate_width(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        coordinate_width = _parse_coordinate_width(d.pop("coordinate_width", UNSET))


        def _parse_coordinate_height(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        coordinate_height = _parse_coordinate_height(d.pop("coordinate_height", UNSET))


        confidence = d.pop("confidence", UNSET)

        extraction_citation = cls(
            block_index=block_index,
            page_number=page_number,
            bbox=bbox,
            source_type=source_type,
            granularity=granularity,
            region_id=region_id,
            coordinate_width=coordinate_width,
            coordinate_height=coordinate_height,
            confidence=confidence,
        )

        return extraction_citation
