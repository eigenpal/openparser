from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.region_type import RegionType
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.bounding_box import BoundingBox
  from ..models.region_polygon_type_0_item import RegionPolygonType0Item





T = TypeVar("T", bound="Region")



@_attrs_define
class Region:
    """
        Attributes:
            id (str):
            page_number (int):
            type_ (RegionType):
            bbox (BoundingBox): Axis-aligned integer page coordinates with exclusive right and bottom edges.
            polygon (list[RegionPolygonType0Item] | None | Unset):
            coordinate_width (int | None | Unset):
            coordinate_height (int | None | Unset):
            confidence (float | None | Unset):
            source_label (None | str | Unset):
     """

    id: str
    page_number: int
    type_: RegionType
    bbox: BoundingBox
    polygon: list[RegionPolygonType0Item] | None | Unset = UNSET
    coordinate_width: int | None | Unset = UNSET
    coordinate_height: int | None | Unset = UNSET
    confidence: float | None | Unset = UNSET
    source_label: None | str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.bounding_box import BoundingBox
        from ..models.region_polygon_type_0_item import RegionPolygonType0Item
        id = self.id

        page_number = self.page_number

        type_ = self.type_.value

        bbox = self.bbox.to_dict()

        polygon: list[dict[str, Any]] | None | Unset
        if isinstance(self.polygon, Unset):
            polygon = UNSET
        elif isinstance(self.polygon, list):
            polygon = []
            for polygon_type_0_item_data in self.polygon:
                polygon_type_0_item = polygon_type_0_item_data.to_dict()
                polygon.append(polygon_type_0_item)


        else:
            polygon = self.polygon

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

        confidence: float | None | Unset
        if isinstance(self.confidence, Unset):
            confidence = UNSET
        else:
            confidence = self.confidence

        source_label: None | str | Unset
        if isinstance(self.source_label, Unset):
            source_label = UNSET
        else:
            source_label = self.source_label


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "page_number": page_number,
            "type": type_,
            "bbox": bbox,
        })
        if polygon is not UNSET:
            field_dict["polygon"] = polygon
        if coordinate_width is not UNSET:
            field_dict["coordinate_width"] = coordinate_width
        if coordinate_height is not UNSET:
            field_dict["coordinate_height"] = coordinate_height
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if source_label is not UNSET:
            field_dict["source_label"] = source_label

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.bounding_box import BoundingBox
        from ..models.region_polygon_type_0_item import RegionPolygonType0Item
        d = dict(src_dict)
        id = d.pop("id")

        page_number = d.pop("page_number")

        type_ = RegionType(d.pop("type"))




        bbox = BoundingBox.from_dict(d.pop("bbox"))




        def _parse_polygon(data: object) -> list[RegionPolygonType0Item] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                polygon_type_0 = []
                _polygon_type_0 = data
                for polygon_type_0_item_data in (_polygon_type_0):
                    polygon_type_0_item = RegionPolygonType0Item.from_dict(polygon_type_0_item_data)



                    polygon_type_0.append(polygon_type_0_item)

                return polygon_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[RegionPolygonType0Item] | None | Unset, data)

        polygon = _parse_polygon(d.pop("polygon", UNSET))


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


        def _parse_confidence(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        confidence = _parse_confidence(d.pop("confidence", UNSET))


        def _parse_source_label(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        source_label = _parse_source_label(d.pop("source_label", UNSET))


        region = cls(
            id=id,
            page_number=page_number,
            type_=type_,
            bbox=bbox,
            polygon=polygon,
            coordinate_width=coordinate_width,
            coordinate_height=coordinate_height,
            confidence=confidence,
            source_label=source_label,
        )

        return region
