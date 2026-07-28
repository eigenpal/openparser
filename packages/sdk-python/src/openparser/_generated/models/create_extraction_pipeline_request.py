from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.create_extraction_pipeline_request_grounding import CreateExtractionPipelineRequestGrounding
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.create_extraction_pipeline_request_llm_options import CreateExtractionPipelineRequestLlmOptions
  from ..models.create_extraction_pipeline_request_ocr_options import CreateExtractionPipelineRequestOcrOptions
  from ..models.create_extraction_pipeline_request_schema import CreateExtractionPipelineRequestSchema





T = TypeVar("T", bound="CreateExtractionPipelineRequest")



@_attrs_define
class CreateExtractionPipelineRequest:
    """ Create a tenant-scoped saved extraction configuration.

        Attributes:
            name (str):
            ocr_model (str):
            llm_model (str):
            schema (CreateExtractionPipelineRequestSchema): JSON Schema object describing fields to extract. Root must be an
                object schema with
                explicit `properties` and at least one named property. Admission applies the same
                strict structured-output normalization as extract.
            slug (str | Unset):
            ocr_options (CreateExtractionPipelineRequestOcrOptions | Unset):
            llm_options (CreateExtractionPipelineRequestLlmOptions | Unset):
            repair_attempts (int | Unset):
            grounding (CreateExtractionPipelineRequestGrounding | Unset):
     """

    name: str
    ocr_model: str
    llm_model: str
    schema: CreateExtractionPipelineRequestSchema
    slug: str | Unset = UNSET
    ocr_options: CreateExtractionPipelineRequestOcrOptions | Unset = UNSET
    llm_options: CreateExtractionPipelineRequestLlmOptions | Unset = UNSET
    repair_attempts: int | Unset = UNSET
    grounding: CreateExtractionPipelineRequestGrounding | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.create_extraction_pipeline_request_llm_options import CreateExtractionPipelineRequestLlmOptions
        from ..models.create_extraction_pipeline_request_ocr_options import CreateExtractionPipelineRequestOcrOptions
        from ..models.create_extraction_pipeline_request_schema import CreateExtractionPipelineRequestSchema
        name = self.name

        ocr_model = self.ocr_model

        llm_model = self.llm_model

        schema = self.schema.to_dict()

        slug = self.slug

        ocr_options: dict[str, Any] | Unset = UNSET
        if not isinstance(self.ocr_options, Unset):
            ocr_options = self.ocr_options.to_dict()

        llm_options: dict[str, Any] | Unset = UNSET
        if not isinstance(self.llm_options, Unset):
            llm_options = self.llm_options.to_dict()

        repair_attempts = self.repair_attempts

        grounding: str | Unset = UNSET
        if not isinstance(self.grounding, Unset):
            grounding = self.grounding.value



        field_dict: dict[str, Any] = {}

        field_dict.update({
            "name": name,
            "ocr_model": ocr_model,
            "llm_model": llm_model,
            "schema": schema,
        })
        if slug is not UNSET:
            field_dict["slug"] = slug
        if ocr_options is not UNSET:
            field_dict["ocr_options"] = ocr_options
        if llm_options is not UNSET:
            field_dict["llm_options"] = llm_options
        if repair_attempts is not UNSET:
            field_dict["repair_attempts"] = repair_attempts
        if grounding is not UNSET:
            field_dict["grounding"] = grounding

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_extraction_pipeline_request_llm_options import CreateExtractionPipelineRequestLlmOptions
        from ..models.create_extraction_pipeline_request_ocr_options import CreateExtractionPipelineRequestOcrOptions
        from ..models.create_extraction_pipeline_request_schema import CreateExtractionPipelineRequestSchema
        d = dict(src_dict)
        name = d.pop("name")

        ocr_model = d.pop("ocr_model")

        llm_model = d.pop("llm_model")

        schema = CreateExtractionPipelineRequestSchema.from_dict(d.pop("schema"))




        slug = d.pop("slug", UNSET)

        _ocr_options = d.pop("ocr_options", UNSET)
        ocr_options: CreateExtractionPipelineRequestOcrOptions | Unset
        if isinstance(_ocr_options,  Unset):
            ocr_options = UNSET
        else:
            ocr_options = CreateExtractionPipelineRequestOcrOptions.from_dict(_ocr_options)




        _llm_options = d.pop("llm_options", UNSET)
        llm_options: CreateExtractionPipelineRequestLlmOptions | Unset
        if isinstance(_llm_options,  Unset):
            llm_options = UNSET
        else:
            llm_options = CreateExtractionPipelineRequestLlmOptions.from_dict(_llm_options)




        repair_attempts = d.pop("repair_attempts", UNSET)

        _grounding = d.pop("grounding", UNSET)
        grounding: CreateExtractionPipelineRequestGrounding | Unset
        if isinstance(_grounding,  Unset):
            grounding = UNSET
        else:
            grounding = CreateExtractionPipelineRequestGrounding(_grounding)




        create_extraction_pipeline_request = cls(
            name=name,
            ocr_model=ocr_model,
            llm_model=llm_model,
            schema=schema,
            slug=slug,
            ocr_options=ocr_options,
            llm_options=llm_options,
            repair_attempts=repair_attempts,
            grounding=grounding,
        )

        return create_extraction_pipeline_request
