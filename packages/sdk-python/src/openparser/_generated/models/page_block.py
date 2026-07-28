from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.page_block_kind import PageBlockKind
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.bounding_box import BoundingBox
  from ..models.page_block_polygon_type_0_item import PageBlockPolygonType0Item





T = TypeVar("T", bound="PageBlock")



@_attrs_define
class PageBlock:
    """ Primary stable parse interface: one ordered page block in reading order. Optional core
    fields are serialized as JSON `null` when absent.

        Attributes:
            index (int): Zero-based reading-order index, contiguous from 0.
            page_number (int):
            kind (PageBlockKind):
            text (None | str | Unset):
            table_html (None | str | Unset):
            figure_uri (None | str | Unset):
            bbox (BoundingBox | None | Unset):
            polygon (list[PageBlockPolygonType0Item] | None | Unset):
            confidence (float | None | Unset):
            source_label (None | str | Unset):
            region_id (None | str | Unset):
            coordinate_width (int | None | Unset):
            coordinate_height (int | None | Unset):
     """

    index: int
    page_number: int
    kind: PageBlockKind
    text: None | str | Unset = UNSET
    table_html: None | str | Unset = UNSET
    figure_uri: None | str | Unset = UNSET
    bbox: BoundingBox | None | Unset = UNSET
    polygon: list[PageBlockPolygonType0Item] | None | Unset = UNSET
    confidence: float | None | Unset = UNSET
    source_label: None | str | Unset = UNSET
    region_id: None | str | Unset = UNSET
    coordinate_width: int | None | Unset = UNSET
    coordinate_height: int | None | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.bounding_box import BoundingBox
        from ..models.page_block_polygon_type_0_item import PageBlockPolygonType0Item
        index = self.index

        page_number = self.page_number

        kind = self.kind.value

        text: None | str | Unset
        if isinstance(self.text, Unset):
            text = UNSET
        else:
            text = self.text

        table_html: None | str | Unset
        if isinstance(self.table_html, Unset):
            table_html = UNSET
        else:
            table_html = self.table_html

        figure_uri: None | str | Unset
        if isinstance(self.figure_uri, Unset):
            figure_uri = UNSET
        else:
            figure_uri = self.figure_uri

        bbox: dict[str, Any] | None | Unset
        if isinstance(self.bbox, Unset):
            bbox = UNSET
        elif isinstance(self.bbox, BoundingBox):
            bbox = self.bbox.to_dict()
        else:
            bbox = self.bbox

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

        region_id: None | str | Unset
        if isinstance(self.region_id, Unset):
            region_id = UNSET
        else:
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


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "index": index,
            "page_number": page_number,
            "kind": kind,
        })
        if text is not UNSET:
            field_dict["text"] = text
        if table_html is not UNSET:
            field_dict["table_html"] = table_html
        if figure_uri is not UNSET:
            field_dict["figure_uri"] = figure_uri
        if bbox is not UNSET:
            field_dict["bbox"] = bbox
        if polygon is not UNSET:
            field_dict["polygon"] = polygon
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if source_label is not UNSET:
            field_dict["source_label"] = source_label
        if region_id is not UNSET:
            field_dict["region_id"] = region_id
        if coordinate_width is not UNSET:
            field_dict["coordinate_width"] = coordinate_width
        if coordinate_height is not UNSET:
            field_dict["coordinate_height"] = coordinate_height

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.bounding_box import BoundingBox
        from ..models.page_block_polygon_type_0_item import PageBlockPolygonType0Item
        d = dict(src_dict)
        index = d.pop("index")

        page_number = d.pop("page_number")

        kind = PageBlockKind(d.pop("kind"))




        def _parse_text(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        text = _parse_text(d.pop("text", UNSET))


        def _parse_table_html(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        table_html = _parse_table_html(d.pop("table_html", UNSET))


        def _parse_figure_uri(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        figure_uri = _parse_figure_uri(d.pop("figure_uri", UNSET))


        def _parse_bbox(data: object) -> BoundingBox | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                bbox_type_0 = BoundingBox.from_dict(data)



                return bbox_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(BoundingBox | None | Unset, data)

        bbox = _parse_bbox(d.pop("bbox", UNSET))


        def _parse_polygon(data: object) -> list[PageBlockPolygonType0Item] | None | Unset:
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
                    polygon_type_0_item = PageBlockPolygonType0Item.from_dict(polygon_type_0_item_data)



                    polygon_type_0.append(polygon_type_0_item)

                return polygon_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[PageBlockPolygonType0Item] | None | Unset, data)

        polygon = _parse_polygon(d.pop("polygon", UNSET))


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


        def _parse_region_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        region_id = _parse_region_id(d.pop("region_id", UNSET))


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


        page_block = cls(
            index=index,
            page_number=page_number,
            kind=kind,
            text=text,
            table_html=table_html,
            figure_uri=figure_uri,
            bbox=bbox,
            polygon=polygon,
            confidence=confidence,
            source_label=source_label,
            region_id=region_id,
            coordinate_width=coordinate_width,
            coordinate_height=coordinate_height,
        )

        return page_block
