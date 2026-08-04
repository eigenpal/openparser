from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.document_element_kind import DocumentElementKind
from ..models.extraction_citation_granularity import ExtractionCitationGranularity
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.bounding_box import BoundingBox
  from ..models.confidence import Confidence
  from ..models.point import Point





T = TypeVar("T", bound="ExtractionCitation")



@_attrs_define
class ExtractionCitation:
    """ Verified provenance for one extracted leaf citation. Geometry comes from the parse graph element or table cell,
    never the model.

        Attributes:
            element_id (str):
            page_number (int):
            bbox (BoundingBox): Axis-aligned integer page coordinates with exclusive right and bottom edges.
            source_type (DocumentElementKind):
            granularity (ExtractionCitationGranularity): Citation geometry granularity. Citation v1 emits `element` and
                `table_cell`;
                `text_span` is reserved for a later narrowing release.
            table_cell_id (str | Unset):
            polygon (list[Point] | Unset):
            confidence (Confidence | Unset):
     """

    element_id: str
    page_number: int
    bbox: BoundingBox
    source_type: DocumentElementKind
    granularity: ExtractionCitationGranularity
    table_cell_id: str | Unset = UNSET
    polygon: list[Point] | Unset = UNSET
    confidence: Confidence | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.bounding_box import BoundingBox
        from ..models.confidence import Confidence
        from ..models.point import Point
        element_id = self.element_id

        page_number = self.page_number

        bbox = self.bbox.to_dict()

        source_type = self.source_type.value

        granularity = self.granularity.value

        table_cell_id = self.table_cell_id

        polygon: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.polygon, Unset):
            polygon = []
            for componentsschemas_polygon_item_data in self.polygon:
                componentsschemas_polygon_item = componentsschemas_polygon_item_data.to_dict()
                polygon.append(componentsschemas_polygon_item)



        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "element_id": element_id,
            "page_number": page_number,
            "bbox": bbox,
            "source_type": source_type,
            "granularity": granularity,
        })
        if table_cell_id is not UNSET:
            field_dict["table_cell_id"] = table_cell_id
        if polygon is not UNSET:
            field_dict["polygon"] = polygon
        if confidence is not UNSET:
            field_dict["confidence"] = confidence

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.bounding_box import BoundingBox
        from ..models.confidence import Confidence
        from ..models.point import Point
        d = dict(src_dict)
        element_id = d.pop("element_id")

        page_number = d.pop("page_number")

        bbox = BoundingBox.from_dict(d.pop("bbox"))




        source_type = DocumentElementKind(d.pop("source_type"))




        granularity = ExtractionCitationGranularity(d.pop("granularity"))




        table_cell_id = d.pop("table_cell_id", UNSET)

        _polygon = d.pop("polygon", UNSET)
        polygon: list[Point] | Unset = UNSET
        if _polygon is not UNSET:
            polygon = []
            for componentsschemas_polygon_item_data in _polygon:
                componentsschemas_polygon_item = Point.from_dict(componentsschemas_polygon_item_data)



                polygon.append(componentsschemas_polygon_item)


        _confidence = d.pop("confidence", UNSET)
        confidence: Confidence | Unset
        if isinstance(_confidence,  Unset):
            confidence = UNSET
        else:
            confidence = Confidence.from_dict(_confidence)




        extraction_citation = cls(
            element_id=element_id,
            page_number=page_number,
            bbox=bbox,
            source_type=source_type,
            granularity=granularity,
            table_cell_id=table_cell_id,
            polygon=polygon,
            confidence=confidence,
        )

        return extraction_citation
