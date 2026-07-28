from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.update_extraction_pipeline_request_grounding import UpdateExtractionPipelineRequestGrounding
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.update_extraction_pipeline_request_llm_options_type_0 import UpdateExtractionPipelineRequestLlmOptionsType0
  from ..models.update_extraction_pipeline_request_ocr_options_type_0 import UpdateExtractionPipelineRequestOcrOptionsType0
  from ..models.update_extraction_pipeline_request_schema import UpdateExtractionPipelineRequestSchema





T = TypeVar("T", bound="UpdateExtractionPipelineRequest")



@_attrs_define
class UpdateExtractionPipelineRequest:
    """ Partial update; at least one field required. Successful updates bump `version`.

        Attributes:
            name (str | Unset):
            slug (None | str | Unset):
            ocr_model (str | Unset):
            ocr_options (None | Unset | UpdateExtractionPipelineRequestOcrOptionsType0):
            llm_model (str | Unset):
            llm_options (None | Unset | UpdateExtractionPipelineRequestLlmOptionsType0):
            schema (UpdateExtractionPipelineRequestSchema | Unset): Replacement extraction schema. Root must be an object
                schema with explicit `properties`
                and at least one named property. Merged pipeline config is re-validated on every update.
            repair_attempts (int | Unset):
            grounding (UpdateExtractionPipelineRequestGrounding | Unset):
     """

    name: str | Unset = UNSET
    slug: None | str | Unset = UNSET
    ocr_model: str | Unset = UNSET
    ocr_options: None | Unset | UpdateExtractionPipelineRequestOcrOptionsType0 = UNSET
    llm_model: str | Unset = UNSET
    llm_options: None | Unset | UpdateExtractionPipelineRequestLlmOptionsType0 = UNSET
    schema: UpdateExtractionPipelineRequestSchema | Unset = UNSET
    repair_attempts: int | Unset = UNSET
    grounding: UpdateExtractionPipelineRequestGrounding | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.update_extraction_pipeline_request_llm_options_type_0 import UpdateExtractionPipelineRequestLlmOptionsType0
        from ..models.update_extraction_pipeline_request_ocr_options_type_0 import UpdateExtractionPipelineRequestOcrOptionsType0
        from ..models.update_extraction_pipeline_request_schema import UpdateExtractionPipelineRequestSchema
        name = self.name

        slug: None | str | Unset
        if isinstance(self.slug, Unset):
            slug = UNSET
        else:
            slug = self.slug

        ocr_model = self.ocr_model

        ocr_options: dict[str, Any] | None | Unset
        if isinstance(self.ocr_options, Unset):
            ocr_options = UNSET
        elif isinstance(self.ocr_options, UpdateExtractionPipelineRequestOcrOptionsType0):
            ocr_options = self.ocr_options.to_dict()
        else:
            ocr_options = self.ocr_options

        llm_model = self.llm_model

        llm_options: dict[str, Any] | None | Unset
        if isinstance(self.llm_options, Unset):
            llm_options = UNSET
        elif isinstance(self.llm_options, UpdateExtractionPipelineRequestLlmOptionsType0):
            llm_options = self.llm_options.to_dict()
        else:
            llm_options = self.llm_options

        schema: dict[str, Any] | Unset = UNSET
        if not isinstance(self.schema, Unset):
            schema = self.schema.to_dict()

        repair_attempts = self.repair_attempts

        grounding: str | Unset = UNSET
        if not isinstance(self.grounding, Unset):
            grounding = self.grounding.value



        field_dict: dict[str, Any] = {}

        field_dict.update({
        })
        if name is not UNSET:
            field_dict["name"] = name
        if slug is not UNSET:
            field_dict["slug"] = slug
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
        from ..models.update_extraction_pipeline_request_llm_options_type_0 import UpdateExtractionPipelineRequestLlmOptionsType0
        from ..models.update_extraction_pipeline_request_ocr_options_type_0 import UpdateExtractionPipelineRequestOcrOptionsType0
        from ..models.update_extraction_pipeline_request_schema import UpdateExtractionPipelineRequestSchema
        d = dict(src_dict)
        name = d.pop("name", UNSET)

        def _parse_slug(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        slug = _parse_slug(d.pop("slug", UNSET))


        ocr_model = d.pop("ocr_model", UNSET)

        def _parse_ocr_options(data: object) -> None | Unset | UpdateExtractionPipelineRequestOcrOptionsType0:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                ocr_options_type_0 = UpdateExtractionPipelineRequestOcrOptionsType0.from_dict(data)



                return ocr_options_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UpdateExtractionPipelineRequestOcrOptionsType0, data)

        ocr_options = _parse_ocr_options(d.pop("ocr_options", UNSET))


        llm_model = d.pop("llm_model", UNSET)

        def _parse_llm_options(data: object) -> None | Unset | UpdateExtractionPipelineRequestLlmOptionsType0:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                llm_options_type_0 = UpdateExtractionPipelineRequestLlmOptionsType0.from_dict(data)



                return llm_options_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UpdateExtractionPipelineRequestLlmOptionsType0, data)

        llm_options = _parse_llm_options(d.pop("llm_options", UNSET))


        _schema = d.pop("schema", UNSET)
        schema: UpdateExtractionPipelineRequestSchema | Unset
        if isinstance(_schema,  Unset):
            schema = UNSET
        else:
            schema = UpdateExtractionPipelineRequestSchema.from_dict(_schema)




        repair_attempts = d.pop("repair_attempts", UNSET)

        _grounding = d.pop("grounding", UNSET)
        grounding: UpdateExtractionPipelineRequestGrounding | Unset
        if isinstance(_grounding,  Unset):
            grounding = UNSET
        else:
            grounding = UpdateExtractionPipelineRequestGrounding(_grounding)




        update_extraction_pipeline_request = cls(
            name=name,
            slug=slug,
            ocr_model=ocr_model,
            ocr_options=ocr_options,
            llm_model=llm_model,
            llm_options=llm_options,
            schema=schema,
            repair_attempts=repair_attempts,
            grounding=grounding,
        )

        return update_extraction_pipeline_request
