from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.bounding_box import BoundingBox
  from ..models.point import Point





T = TypeVar("T", bound="Geometry")



@_attrs_define
class Geometry:
    """
        Attributes:
            page_number (int):
            bbox (BoundingBox): Axis-aligned integer page coordinates with exclusive right and bottom edges.
            polygon (list[Point] | Unset):
            rotation_degrees (float | Unset):
     """

    page_number: int
    bbox: BoundingBox
    polygon: list[Point] | Unset = UNSET
    rotation_degrees: float | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.bounding_box import BoundingBox
        from ..models.point import Point
        page_number = self.page_number

        bbox = self.bbox.to_dict()

        polygon: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.polygon, Unset):
            polygon = []
            for componentsschemas_polygon_item_data in self.polygon:
                componentsschemas_polygon_item = componentsschemas_polygon_item_data.to_dict()
                polygon.append(componentsschemas_polygon_item)



        rotation_degrees = self.rotation_degrees


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "page_number": page_number,
            "bbox": bbox,
        })
        if polygon is not UNSET:
            field_dict["polygon"] = polygon
        if rotation_degrees is not UNSET:
            field_dict["rotation_degrees"] = rotation_degrees

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.bounding_box import BoundingBox
        from ..models.point import Point
        d = dict(src_dict)
        page_number = d.pop("page_number")

        bbox = BoundingBox.from_dict(d.pop("bbox"))




        _polygon = d.pop("polygon", UNSET)
        polygon: list[Point] | Unset = UNSET
        if _polygon is not UNSET:
            polygon = []
            for componentsschemas_polygon_item_data in _polygon:
                componentsschemas_polygon_item = Point.from_dict(componentsschemas_polygon_item_data)



                polygon.append(componentsschemas_polygon_item)


        rotation_degrees = d.pop("rotation_degrees", UNSET)

        geometry = cls(
            page_number=page_number,
            bbox=bbox,
            polygon=polygon,
            rotation_degrees=rotation_degrees,
        )

        return geometry
