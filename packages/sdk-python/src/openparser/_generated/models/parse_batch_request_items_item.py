from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.parse_batch_request_items_item_ocr_options import ParseBatchRequestItemsItemOcrOptions





T = TypeVar("T", bound="ParseBatchRequestItemsItem")



@_attrs_define
class ParseBatchRequestItemsItem:
    """
        Attributes:
            client_item_id (str):
            ocr_model (str):
            file_index (int | Unset):
            file_id (str | Unset):
            ocr_options (ParseBatchRequestItemsItemOcrOptions | Unset):
     """

    client_item_id: str
    ocr_model: str
    file_index: int | Unset = UNSET
    file_id: str | Unset = UNSET
    ocr_options: ParseBatchRequestItemsItemOcrOptions | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.parse_batch_request_items_item_ocr_options import ParseBatchRequestItemsItemOcrOptions
        client_item_id = self.client_item_id

        ocr_model = self.ocr_model

        file_index = self.file_index

        file_id = self.file_id

        ocr_options: dict[str, Any] | Unset = UNSET
        if not isinstance(self.ocr_options, Unset):
            ocr_options = self.ocr_options.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "client_item_id": client_item_id,
            "ocr_model": ocr_model,
        })
        if file_index is not UNSET:
            field_dict["file_index"] = file_index
        if file_id is not UNSET:
            field_dict["file_id"] = file_id
        if ocr_options is not UNSET:
            field_dict["ocr_options"] = ocr_options

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.parse_batch_request_items_item_ocr_options import ParseBatchRequestItemsItemOcrOptions
        d = dict(src_dict)
        client_item_id = d.pop("client_item_id")

        ocr_model = d.pop("ocr_model")

        file_index = d.pop("file_index", UNSET)

        file_id = d.pop("file_id", UNSET)

        _ocr_options = d.pop("ocr_options", UNSET)
        ocr_options: ParseBatchRequestItemsItemOcrOptions | Unset
        if isinstance(_ocr_options,  Unset):
            ocr_options = UNSET
        else:
            ocr_options = ParseBatchRequestItemsItemOcrOptions.from_dict(_ocr_options)




        parse_batch_request_items_item = cls(
            client_item_id=client_item_id,
            ocr_model=ocr_model,
            file_index=file_index,
            file_id=file_id,
            ocr_options=ocr_options,
        )

        return parse_batch_request_items_item
