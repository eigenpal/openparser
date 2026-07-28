from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.batch_child_summary import BatchChildSummary





T = TypeVar("T", bound="BatchChildPage")



@_attrs_define
class BatchChildPage:
    """
        Attributes:
            items (list[BatchChildSummary]):
            next_cursor (None | str | Unset): Present when more child summaries are available.
     """

    items: list[BatchChildSummary]
    next_cursor: None | str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.batch_child_summary import BatchChildSummary
        items = []
        for items_item_data in self.items:
            items_item = items_item_data.to_dict()
            items.append(items_item)



        next_cursor: None | str | Unset
        if isinstance(self.next_cursor, Unset):
            next_cursor = UNSET
        else:
            next_cursor = self.next_cursor


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "items": items,
        })
        if next_cursor is not UNSET:
            field_dict["next_cursor"] = next_cursor

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.batch_child_summary import BatchChildSummary
        d = dict(src_dict)
        items = []
        _items = d.pop("items")
        for items_item_data in (_items):
            items_item = BatchChildSummary.from_dict(items_item_data)



            items.append(items_item)


        def _parse_next_cursor(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        next_cursor = _parse_next_cursor(d.pop("next_cursor", UNSET))


        batch_child_page = cls(
            items=items,
            next_cursor=next_cursor,
        )

        return batch_child_page
