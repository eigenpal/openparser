from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.extraction_grounding_mode import ExtractionGroundingMode
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.extraction_pipeline_llm_options import ExtractionPipelineLlmOptions
  from ..models.extraction_pipeline_ocr_options import ExtractionPipelineOcrOptions
  from ..models.extraction_pipeline_schema import ExtractionPipelineSchema





T = TypeVar("T", bound="ExtractionPipeline")



@_attrs_define
class ExtractionPipeline:
    """ Public saved extraction pipeline resource.

        Attributes:
            id (str): Prefixed public id for a saved extraction pipeline (`oppl_…`).
            name (str):
            slug (None | str):
            version (int):
            ocr_model (str):
            ocr_options (ExtractionPipelineOcrOptions):
            llm_model (str): OpenRouter model slug from the compatible OCR extraction catalog
                (`GET /models/llm`). Unknown or deprecated values return `422 unsupported_llm_model`.
                Ordinary extract may use any currently compatible model; field grounding requires a
                certified model.
                 Example: openai/gpt-5.6-terra.
            llm_options (ExtractionPipelineLlmOptions):
            schema (ExtractionPipelineSchema): Persisted extraction schema with at least one root property. Normalized for
                strict
                structured outputs at save time.
            repair_attempts (int):
            grounding (ExtractionGroundingMode): Extraction grounding mode. `none` preserves ordinary extraction. `field`
                requests
                verified per-leaf source citations (citation v1 emits block-level citations only).
            created_at (datetime.datetime):
            updated_at (datetime.datetime):
     """

    id: str
    name: str
    slug: None | str
    version: int
    ocr_model: str
    ocr_options: ExtractionPipelineOcrOptions
    llm_model: str
    llm_options: ExtractionPipelineLlmOptions
    schema: ExtractionPipelineSchema
    repair_attempts: int
    grounding: ExtractionGroundingMode
    created_at: datetime.datetime
    updated_at: datetime.datetime





    def to_dict(self) -> dict[str, Any]:
        from ..models.extraction_pipeline_llm_options import ExtractionPipelineLlmOptions
        from ..models.extraction_pipeline_ocr_options import ExtractionPipelineOcrOptions
        from ..models.extraction_pipeline_schema import ExtractionPipelineSchema
        id = self.id

        name = self.name

        slug: None | str
        slug = self.slug

        version = self.version

        ocr_model = self.ocr_model

        ocr_options = self.ocr_options.to_dict()

        llm_model = self.llm_model

        llm_options = self.llm_options.to_dict()

        schema = self.schema.to_dict()

        repair_attempts = self.repair_attempts

        grounding = self.grounding.value

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "name": name,
            "slug": slug,
            "version": version,
            "ocr_model": ocr_model,
            "ocr_options": ocr_options,
            "llm_model": llm_model,
            "llm_options": llm_options,
            "schema": schema,
            "repair_attempts": repair_attempts,
            "grounding": grounding,
            "created_at": created_at,
            "updated_at": updated_at,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.extraction_pipeline_llm_options import ExtractionPipelineLlmOptions
        from ..models.extraction_pipeline_ocr_options import ExtractionPipelineOcrOptions
        from ..models.extraction_pipeline_schema import ExtractionPipelineSchema
        d = dict(src_dict)
        id = d.pop("id")

        name = d.pop("name")

        def _parse_slug(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        slug = _parse_slug(d.pop("slug"))


        version = d.pop("version")

        ocr_model = d.pop("ocr_model")

        ocr_options = ExtractionPipelineOcrOptions.from_dict(d.pop("ocr_options"))




        llm_model = d.pop("llm_model")

        llm_options = ExtractionPipelineLlmOptions.from_dict(d.pop("llm_options"))




        schema = ExtractionPipelineSchema.from_dict(d.pop("schema"))




        repair_attempts = d.pop("repair_attempts")

        grounding = ExtractionGroundingMode(d.pop("grounding"))




        created_at = isoparse(d.pop("created_at"))




        updated_at = isoparse(d.pop("updated_at"))




        extraction_pipeline = cls(
            id=id,
            name=name,
            slug=slug,
            version=version,
            ocr_model=ocr_model,
            ocr_options=ocr_options,
            llm_model=llm_model,
            llm_options=llm_options,
            schema=schema,
            repair_attempts=repair_attempts,
            grounding=grounding,
            created_at=created_at,
            updated_at=updated_at,
        )

        return extraction_pipeline
