from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from typing import Literal, cast

if TYPE_CHECKING:
  from ..models.confidence import Confidence
  from ..models.geometry import Geometry
  from ..models.source_provenance import SourceProvenance
  from ..models.table_cell import TableCell





T = TypeVar("T", bound="TableElement")



@_attrs_define
class TableElement:
    """
        Attributes:
            id (str):
            locations (list[Geometry]):
            kind (Literal['table']):
            row_count (int):
            column_count (int):
            cells (list[TableCell]):
            confidence (Confidence | Unset):
            source (SourceProvenance | Unset):
            html (str | Unset):
            markdown (str | Unset):
     """

    id: str
    locations: list[Geometry]
    kind: Literal['table']
    row_count: int
    column_count: int
    cells: list[TableCell]
    confidence: Confidence | Unset = UNSET
    source: SourceProvenance | Unset = UNSET
    html: str | Unset = UNSET
    markdown: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.source_provenance import SourceProvenance
        from ..models.table_cell import TableCell
        id = self.id

        locations = []
        for locations_item_data in self.locations:
            locations_item = locations_item_data.to_dict()
            locations.append(locations_item)



        kind = self.kind

        row_count = self.row_count

        column_count = self.column_count

        cells = []
        for cells_item_data in self.cells:
            cells_item = cells_item_data.to_dict()
            cells.append(cells_item)



        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()

        source: dict[str, Any] | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.to_dict()

        html = self.html

        markdown = self.markdown


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "locations": locations,
            "kind": kind,
            "row_count": row_count,
            "column_count": column_count,
            "cells": cells,
        })
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if source is not UNSET:
            field_dict["source"] = source
        if html is not UNSET:
            field_dict["html"] = html
        if markdown is not UNSET:
            field_dict["markdown"] = markdown

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.source_provenance import SourceProvenance
        from ..models.table_cell import TableCell
        d = dict(src_dict)
        id = d.pop("id")

        locations = []
        _locations = d.pop("locations")
        for locations_item_data in (_locations):
            locations_item = Geometry.from_dict(locations_item_data)



            locations.append(locations_item)


        kind = cast(Literal['table'] , d.pop("kind"))
        if kind != 'table':
            raise ValueError(f"kind must match const 'table', got '{kind}'")

        row_count = d.pop("row_count")

        column_count = d.pop("column_count")

        cells = []
        _cells = d.pop("cells")
        for cells_item_data in (_cells):
            cells_item = TableCell.from_dict(cells_item_data)



            cells.append(cells_item)


        _confidence = d.pop("confidence", UNSET)
        confidence: Confidence | Unset
        if isinstance(_confidence,  Unset):
            confidence = UNSET
        else:
            confidence = Confidence.from_dict(_confidence)




        _source = d.pop("source", UNSET)
        source: SourceProvenance | Unset
        if isinstance(_source,  Unset):
            source = UNSET
        else:
            source = SourceProvenance.from_dict(_source)




        html = d.pop("html", UNSET)

        markdown = d.pop("markdown", UNSET)

        table_element = cls(
            id=id,
            locations=locations,
            kind=kind,
            row_count=row_count,
            column_count=column_count,
            cells=cells,
            confidence=confidence,
            source=source,
            html=html,
            markdown=markdown,
        )

        return table_element
