from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.extract_request_grounding import ExtractRequestGrounding
from ..models.extract_request_output_format import ExtractRequestOutputFormat
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.extract_request_llm_options import ExtractRequestLlmOptions
  from ..models.extract_request_ocr_options import ExtractRequestOcrOptions
  from ..models.extract_request_schema import ExtractRequestSchema





T = TypeVar("T", bound="ExtractRequest")



@_attrs_define
class ExtractRequest:
    """ Single extract config. Provide either `pipeline_id` or inline extraction config.
    The source is exactly one of multipart file bytes, `file_id`, or tenant-owned succeeded
    `parse_job_id`. Parse reuse is single-extract-only, forbids `ocr_model` / `ocr_options`,
    does not run OCR, and adds no page charge. `parse_job_id` is part of idempotency identity.

        Attributes:
            pipeline_id (str | Unset): Saved extraction pipeline id (`oppl_…`). Inline extraction fields are forbidden.
                Admission records pipeline id/version provenance and snapshots the effective extraction
                configuration; the worker never re-reads the pipeline. With `parse_job_id`, source-parse
                provenance is recorded separately and the pipeline's OCR settings are not executed.
            ocr_model (str | Unset):
            ocr_options (ExtractRequestOcrOptions | Unset):
            llm_model (str | Unset):
            llm_options (ExtractRequestLlmOptions | Unset):
            schema (ExtractRequestSchema | Unset):
            repair_attempts (int | Unset):
            grounding (ExtractRequestGrounding | Unset): Optional field grounding mode. Defaults to `none` for inline
                requests. Changing
                grounding with the same Idempotency-Key returns `409 idempotency_conflict`.
                Unsupported schemas return `422 grounding_unsupported_schema`.
            file_id (str | Unset):
            parse_job_id (str | Unset): Tenant-owned succeeded `parse` job (`opj_…`) whose canonical `openparser@1`
                ParsedDocument
                is reused. Mutually exclusive with multipart bytes and `file_id`; forbidden in batch.
            output_format (ExtractRequestOutputFormat | Unset):  Default: ExtractRequestOutputFormat.OPENPARSER1.
     """

    pipeline_id: str | Unset = UNSET
    ocr_model: str | Unset = UNSET
    ocr_options: ExtractRequestOcrOptions | Unset = UNSET
    llm_model: str | Unset = UNSET
    llm_options: ExtractRequestLlmOptions | Unset = UNSET
    schema: ExtractRequestSchema | Unset = UNSET
    repair_attempts: int | Unset = UNSET
    grounding: ExtractRequestGrounding | Unset = UNSET
    file_id: str | Unset = UNSET
    parse_job_id: str | Unset = UNSET
    output_format: ExtractRequestOutputFormat | Unset = ExtractRequestOutputFormat.OPENPARSER1





    def to_dict(self) -> dict[str, Any]:
        from ..models.extract_request_llm_options import ExtractRequestLlmOptions
        from ..models.extract_request_ocr_options import ExtractRequestOcrOptions
        from ..models.extract_request_schema import ExtractRequestSchema
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


        file_id = self.file_id

        parse_job_id = self.parse_job_id

        output_format: str | Unset = UNSET
        if not isinstance(self.output_format, Unset):
            output_format = self.output_format.value



        field_dict: dict[str, Any] = {}

        field_dict.update({
        })
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
        if file_id is not UNSET:
            field_dict["file_id"] = file_id
        if parse_job_id is not UNSET:
            field_dict["parse_job_id"] = parse_job_id
        if output_format is not UNSET:
            field_dict["output_format"] = output_format

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.extract_request_llm_options import ExtractRequestLlmOptions
        from ..models.extract_request_ocr_options import ExtractRequestOcrOptions
        from ..models.extract_request_schema import ExtractRequestSchema
        d = dict(src_dict)
        pipeline_id = d.pop("pipeline_id", UNSET)

        ocr_model = d.pop("ocr_model", UNSET)

        _ocr_options = d.pop("ocr_options", UNSET)
        ocr_options: ExtractRequestOcrOptions | Unset
        if isinstance(_ocr_options,  Unset):
            ocr_options = UNSET
        else:
            ocr_options = ExtractRequestOcrOptions.from_dict(_ocr_options)




        llm_model = d.pop("llm_model", UNSET)

        _llm_options = d.pop("llm_options", UNSET)
        llm_options: ExtractRequestLlmOptions | Unset
        if isinstance(_llm_options,  Unset):
            llm_options = UNSET
        else:
            llm_options = ExtractRequestLlmOptions.from_dict(_llm_options)




        _schema = d.pop("schema", UNSET)
        schema: ExtractRequestSchema | Unset
        if isinstance(_schema,  Unset):
            schema = UNSET
        else:
            schema = ExtractRequestSchema.from_dict(_schema)




        repair_attempts = d.pop("repair_attempts", UNSET)

        _grounding = d.pop("grounding", UNSET)
        grounding: ExtractRequestGrounding | Unset
        if isinstance(_grounding,  Unset):
            grounding = UNSET
        else:
            grounding = ExtractRequestGrounding(_grounding)




        file_id = d.pop("file_id", UNSET)

        parse_job_id = d.pop("parse_job_id", UNSET)

        _output_format = d.pop("output_format", UNSET)
        output_format: ExtractRequestOutputFormat | Unset
        if isinstance(_output_format,  Unset):
            output_format = UNSET
        else:
            output_format = ExtractRequestOutputFormat(_output_format)




        extract_request = cls(
            pipeline_id=pipeline_id,
            ocr_model=ocr_model,
            ocr_options=ocr_options,
            llm_model=llm_model,
            llm_options=llm_options,
            schema=schema,
            repair_attempts=repair_attempts,
            grounding=grounding,
            file_id=file_id,
            parse_job_id=parse_job_id,
            output_format=output_format,
        )

        return extract_request
