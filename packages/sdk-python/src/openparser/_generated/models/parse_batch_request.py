from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.parse_batch_request_output_format import ParseBatchRequestOutputFormat
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.parse_batch_request_items_item import ParseBatchRequestItemsItem





T = TypeVar("T", bound="ParseBatchRequest")



@_attrs_define
class ParseBatchRequest:
    """
        Attributes:
            items (list[ParseBatchRequestItemsItem]): Ordered batch items. Each item references either an uploaded `files`
                entry via
                `file_index` or an Eigenpal reusable `file_id`. Uploaded files must be covered by
                exactly one unique `file_index` in `[0, files.length)`.
            output_format (ParseBatchRequestOutputFormat | Unset):  Default: ParseBatchRequestOutputFormat.OPENPARSER1.
     """

    items: list[ParseBatchRequestItemsItem]
    output_format: ParseBatchRequestOutputFormat | Unset = ParseBatchRequestOutputFormat.OPENPARSER1





    def to_dict(self) -> dict[str, Any]:
        from ..models.parse_batch_request_items_item import ParseBatchRequestItemsItem
        items = []
        for items_item_data in self.items:
            items_item = items_item_data.to_dict()
            items.append(items_item)



        output_format: str | Unset = UNSET
        if not isinstance(self.output_format, Unset):
            output_format = self.output_format.value



        field_dict: dict[str, Any] = {}

        field_dict.update({
            "items": items,
        })
        if output_format is not UNSET:
            field_dict["output_format"] = output_format

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.parse_batch_request_items_item import ParseBatchRequestItemsItem
        d = dict(src_dict)
        items = []
        _items = d.pop("items")
        for items_item_data in (_items):
            items_item = ParseBatchRequestItemsItem.from_dict(items_item_data)



            items.append(items_item)


        _output_format = d.pop("output_format", UNSET)
        output_format: ParseBatchRequestOutputFormat | Unset
        if isinstance(_output_format,  Unset):
            output_format = UNSET
        else:
            output_format = ParseBatchRequestOutputFormat(_output_format)




        parse_batch_request = cls(
            items=items,
            output_format=output_format,
        )

        return parse_batch_request
