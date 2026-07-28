from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.extract_batch_item_grounding import ExtractBatchItemGrounding
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.extract_batch_item_llm_options import ExtractBatchItemLlmOptions
  from ..models.extract_batch_item_ocr_options import ExtractBatchItemOcrOptions
  from ..models.extract_batch_item_schema import ExtractBatchItemSchema





T = TypeVar("T", bound="ExtractBatchItem")



@_attrs_define
class ExtractBatchItem:
    """ Per-item file-backed extract config with the same `pipeline_id` XOR inline rules as
    single extract. Sources are `file_index` or `file_id`; `parse_job_id` is not supported
    in batch. No parent-level batch pipeline in v1.

        Attributes:
            client_item_id (str):
            file_index (int | Unset): Zero-based index into the uploaded `files` array. Exactly one of `file_index` or
                `file_id` is required per item.
            file_id (str | Unset):
            pipeline_id (str | Unset): Saved extraction pipeline id; mutually exclusive with inline extract fields.
            ocr_model (str | Unset):
            ocr_options (ExtractBatchItemOcrOptions | Unset):
            llm_model (str | Unset):
            llm_options (ExtractBatchItemLlmOptions | Unset):
            schema (ExtractBatchItemSchema | Unset):
            repair_attempts (int | Unset):
            grounding (ExtractBatchItemGrounding | Unset): Optional field grounding mode. Defaults to `none`. `field` opts
                into verified
                per-leaf citations and is part of idempotency identity.
     """

    client_item_id: str
    file_index: int | Unset = UNSET
    file_id: str | Unset = UNSET
    pipeline_id: str | Unset = UNSET
    ocr_model: str | Unset = UNSET
    ocr_options: ExtractBatchItemOcrOptions | Unset = UNSET
    llm_model: str | Unset = UNSET
    llm_options: ExtractBatchItemLlmOptions | Unset = UNSET
    schema: ExtractBatchItemSchema | Unset = UNSET
    repair_attempts: int | Unset = UNSET
    grounding: ExtractBatchItemGrounding | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.extract_batch_item_llm_options import ExtractBatchItemLlmOptions
        from ..models.extract_batch_item_ocr_options import ExtractBatchItemOcrOptions
        from ..models.extract_batch_item_schema import ExtractBatchItemSchema
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
        from ..models.extract_batch_item_llm_options import ExtractBatchItemLlmOptions
        from ..models.extract_batch_item_ocr_options import ExtractBatchItemOcrOptions
        from ..models.extract_batch_item_schema import ExtractBatchItemSchema
        d = dict(src_dict)
        client_item_id = d.pop("client_item_id")

        file_index = d.pop("file_index", UNSET)

        file_id = d.pop("file_id", UNSET)

        pipeline_id = d.pop("pipeline_id", UNSET)

        ocr_model = d.pop("ocr_model", UNSET)

        _ocr_options = d.pop("ocr_options", UNSET)
        ocr_options: ExtractBatchItemOcrOptions | Unset
        if isinstance(_ocr_options,  Unset):
            ocr_options = UNSET
        else:
            ocr_options = ExtractBatchItemOcrOptions.from_dict(_ocr_options)




        llm_model = d.pop("llm_model", UNSET)

        _llm_options = d.pop("llm_options", UNSET)
        llm_options: ExtractBatchItemLlmOptions | Unset
        if isinstance(_llm_options,  Unset):
            llm_options = UNSET
        else:
            llm_options = ExtractBatchItemLlmOptions.from_dict(_llm_options)




        _schema = d.pop("schema", UNSET)
        schema: ExtractBatchItemSchema | Unset
        if isinstance(_schema,  Unset):
            schema = UNSET
        else:
            schema = ExtractBatchItemSchema.from_dict(_schema)




        repair_attempts = d.pop("repair_attempts", UNSET)

        _grounding = d.pop("grounding", UNSET)
        grounding: ExtractBatchItemGrounding | Unset
        if isinstance(_grounding,  Unset):
            grounding = UNSET
        else:
            grounding = ExtractBatchItemGrounding(_grounding)




        extract_batch_item = cls(
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

        return extract_batch_item
