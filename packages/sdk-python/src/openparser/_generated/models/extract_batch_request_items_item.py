from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.extract_batch_request_items_item_grounding import ExtractBatchRequestItemsItemGrounding
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.extract_batch_request_items_item_llm_options import ExtractBatchRequestItemsItemLlmOptions
  from ..models.extract_batch_request_items_item_ocr_options import ExtractBatchRequestItemsItemOcrOptions
  from ..models.extract_batch_request_items_item_schema import ExtractBatchRequestItemsItemSchema





T = TypeVar("T", bound="ExtractBatchRequestItemsItem")



@_attrs_define
class ExtractBatchRequestItemsItem:
    """
        Attributes:
            client_item_id (str):
            file_index (int | Unset):
            file_id (str | Unset):
            pipeline_id (str | Unset):
            ocr_model (str | Unset):
            ocr_options (ExtractBatchRequestItemsItemOcrOptions | Unset):
            llm_model (str | Unset):
            llm_options (ExtractBatchRequestItemsItemLlmOptions | Unset):
            schema (ExtractBatchRequestItemsItemSchema | Unset):
            repair_attempts (int | Unset):
            grounding (ExtractBatchRequestItemsItemGrounding | Unset):
     """

    client_item_id: str
    file_index: int | Unset = UNSET
    file_id: str | Unset = UNSET
    pipeline_id: str | Unset = UNSET
    ocr_model: str | Unset = UNSET
    ocr_options: ExtractBatchRequestItemsItemOcrOptions | Unset = UNSET
    llm_model: str | Unset = UNSET
    llm_options: ExtractBatchRequestItemsItemLlmOptions | Unset = UNSET
    schema: ExtractBatchRequestItemsItemSchema | Unset = UNSET
    repair_attempts: int | Unset = UNSET
    grounding: ExtractBatchRequestItemsItemGrounding | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.extract_batch_request_items_item_llm_options import ExtractBatchRequestItemsItemLlmOptions
        from ..models.extract_batch_request_items_item_ocr_options import ExtractBatchRequestItemsItemOcrOptions
        from ..models.extract_batch_request_items_item_schema import ExtractBatchRequestItemsItemSchema
        client_item_id = self.client_item_id

        file_index = self.file_index

        file_id = self.file_id

        pipeline_id = self.pipeline_id

        ocr_model = self.ocr_model

        ocr_options: dict[str, Any] | Unset = UNSET
        if not isinstance(self.ocr_options, Unset):
            ocr_options = self.ocr_options.to_dict()

        llm_model = self.llm_model

        llm_options: dict[str, Any] | Unset = UNSET
        if not isinstance(self.llm_options, Unset):
            llm_options = self.llm_options.to_dict()

        schema: dict[str, Any] | Unset = UNSET
        if not isinstance(self.schema, Unset):
            schema = self.schema.to_dict()

        repair_attempts = self.repair_attempts

        grounding: str | Unset = UNSET
        if not isinstance(self.grounding, Unset):
            grounding = self.grounding.value



        field_dict: dict[str, Any] = {}

        field_dict.update({
            "client_item_id": client_item_id,
        })
        if file_index is not UNSET:
            field_dict["file_index"] = file_index
        if file_id is not UNSET:
            field_dict["file_id"] = file_id
        if pipeline_id is not UNSET:
            field_dict["pipeline_id"] = pipeline_id
        if ocr_model is not UNSET:
            field_dict["ocr_model"] = ocr_model
        if ocr_options is not UNSET:
            field_dict["ocr_options"] = ocr_options
        if llm_model is not UNSET:
            field_dict["llm_model"] = llm_model
        if llm_options is not UNSET:
            field_dict["llm_options"] = llm_options
        if schema is not UNSET:
            field_dict["schema"] = schema
        if repair_attempts is not UNSET:
            field_dict["repair_attempts"] = repair_attempts
        if grounding is not UNSET:
            field_dict["grounding"] = grounding

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.extract_batch_request_items_item_llm_options import ExtractBatchRequestItemsItemLlmOptions
        from ..models.extract_batch_request_items_item_ocr_options import ExtractBatchRequestItemsItemOcrOptions
        from ..models.extract_batch_request_items_item_schema import ExtractBatchRequestItemsItemSchema
        d = dict(src_dict)
        client_item_id = d.pop("client_item_id")

        file_index = d.pop("file_index", UNSET)

        file_id = d.pop("file_id", UNSET)

        pipeline_id = d.pop("pipeline_id", UNSET)

        ocr_model = d.pop("ocr_model", UNSET)

        _ocr_options = d.pop("ocr_options", UNSET)
        ocr_options: ExtractBatchRequestItemsItemOcrOptions | Unset
        if isinstance(_ocr_options,  Unset):
            ocr_options = UNSET
        else:
            ocr_options = ExtractBatchRequestItemsItemOcrOptions.from_dict(_ocr_options)




        llm_model = d.pop("llm_model", UNSET)

        _llm_options = d.pop("llm_options", UNSET)
        llm_options: ExtractBatchRequestItemsItemLlmOptions | Unset
        if isinstance(_llm_options,  Unset):
            llm_options = UNSET
        else:
            llm_options = ExtractBatchRequestItemsItemLlmOptions.from_dict(_llm_options)




        _schema = d.pop("schema", UNSET)
        schema: ExtractBatchRequestItemsItemSchema | Unset
        if isinstance(_schema,  Unset):
            schema = UNSET
        else:
            schema = ExtractBatchRequestItemsItemSchema.from_dict(_schema)




        repair_attempts = d.pop("repair_attempts", UNSET)

        _grounding = d.pop("grounding", UNSET)
        grounding: ExtractBatchRequestItemsItemGrounding | Unset
        if isinstance(_grounding,  Unset):
            grounding = UNSET
        else:
            grounding = ExtractBatchRequestItemsItemGrounding(_grounding)




        extract_batch_request_items_item = cls(
            client_item_id=client_item_id,
            file_index=file_index,
            file_id=file_id,
            pipeline_id=pipeline_id,
            ocr_model=ocr_model,
            ocr_options=ocr_options,
            llm_model=llm_model,
            llm_options=llm_options,
            schema=schema,
            repair_attempts=repair_attempts,
            grounding=grounding,
        )

        return extract_batch_request_items_item
