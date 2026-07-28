from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.extract_batch_request_output_format import ExtractBatchRequestOutputFormat
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.extract_batch_request_items_item import ExtractBatchRequestItemsItem





T = TypeVar("T", bound="ExtractBatchRequest")



@_attrs_define
class ExtractBatchRequest:
    """
        Attributes:
            items (list[ExtractBatchRequestItemsItem]): Ordered batch items. Each item references either an uploaded `files`
                entry via
                `file_index` or an Eigenpal reusable `file_id`.
            output_format (ExtractBatchRequestOutputFormat | Unset):  Default: ExtractBatchRequestOutputFormat.OPENPARSER1.
     """

    items: list[ExtractBatchRequestItemsItem]
    output_format: ExtractBatchRequestOutputFormat | Unset = ExtractBatchRequestOutputFormat.OPENPARSER1





    def to_dict(self) -> dict[str, Any]:
        from ..models.extract_batch_request_items_item import ExtractBatchRequestItemsItem
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
        from ..models.extract_batch_request_items_item import ExtractBatchRequestItemsItem
        d = dict(src_dict)
        items = []
        _items = d.pop("items")
        for items_item_data in (_items):
            items_item = ExtractBatchRequestItemsItem.from_dict(items_item_data)



            items.append(items_item)


        _output_format = d.pop("output_format", UNSET)
        output_format: ExtractBatchRequestOutputFormat | Unset
        if isinstance(_output_format,  Unset):
            output_format = UNSET
        else:
            output_format = ExtractBatchRequestOutputFormat(_output_format)




        extract_batch_request = cls(
            items=items,
            output_format=output_format,
        )

        return extract_batch_request
