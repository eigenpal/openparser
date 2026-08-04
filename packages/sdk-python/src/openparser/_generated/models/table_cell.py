from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.table_cell_role import TableCellRole
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.confidence import Confidence
  from ..models.geometry import Geometry
  from ..models.source_provenance import SourceProvenance
  from ..models.text_span import TextSpan





T = TypeVar("T", bound="TableCell")



@_attrs_define
class TableCell:
    """
        Attributes:
            id (str):
            row_index (int):
            column_index (int):
            row_span (int):  Default: 1.
            column_span (int):  Default: 1.
            role (TableCellRole):  Default: TableCellRole.BODY.
            text (str):
            spans (list[TextSpan]):
            locations (list[Geometry]):
            element_ids (list[str]):
            confidence (Confidence | Unset):
            source (SourceProvenance | Unset):
     """

    id: str
    row_index: int
    column_index: int
    text: str
    spans: list[TextSpan]
    locations: list[Geometry]
    element_ids: list[str]
    row_span: int = 1
    column_span: int = 1
    role: TableCellRole = TableCellRole.BODY
    confidence: Confidence | Unset = UNSET
    source: SourceProvenance | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.source_provenance import SourceProvenance
        from ..models.text_span import TextSpan
        id = self.id

        row_index = self.row_index

        column_index = self.column_index

        row_span = self.row_span

        column_span = self.column_span

        role = self.role.value

        text = self.text

        spans = []
        for spans_item_data in self.spans:
            spans_item = spans_item_data.to_dict()
            spans.append(spans_item)



        locations = []
        for locations_item_data in self.locations:
            locations_item = locations_item_data.to_dict()
            locations.append(locations_item)



        element_ids = self.element_ids



        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()

        source: dict[str, Any] | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "row_index": row_index,
            "column_index": column_index,
            "row_span": row_span,
            "column_span": column_span,
            "role": role,
            "text": text,
            "spans": spans,
            "locations": locations,
            "element_ids": element_ids,
        })
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if source is not UNSET:
            field_dict["source"] = source

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.confidence import Confidence
        from ..models.geometry import Geometry
        from ..models.source_provenance import SourceProvenance
        from ..models.text_span import TextSpan
        d = dict(src_dict)
        id = d.pop("id")

        row_index = d.pop("row_index")

        column_index = d.pop("column_index")

        row_span = d.pop("row_span")

        column_span = d.pop("column_span")

        role = TableCellRole(d.pop("role"))




        text = d.pop("text")

        spans = []
        _spans = d.pop("spans")
        for spans_item_data in (_spans):
            spans_item = TextSpan.from_dict(spans_item_data)



            spans.append(spans_item)


        locations = []
        _locations = d.pop("locations")
        for locations_item_data in (_locations):
            locations_item = Geometry.from_dict(locations_item_data)



            locations.append(locations_item)


        element_ids = cast(list[str], d.pop("element_ids"))


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




        table_cell = cls(
            id=id,
            row_index=row_index,
            column_index=column_index,
            row_span=row_span,
            column_span=column_span,
            role=role,
            text=text,
            spans=spans,
            locations=locations,
            element_ids=element_ids,
            confidence=confidence,
            source=source,
        )

        return table_cell
