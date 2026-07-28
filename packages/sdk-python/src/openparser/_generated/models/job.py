from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.job_operation import JobOperation
from ..models.job_status import JobStatus
from ..models.ocr_output_format import OcrOutputFormat
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.batch_child_page import BatchChildPage
  from ..models.batch_summary_counts import BatchSummaryCounts
  from ..models.extraction_terminal_result import ExtractionTerminalResult
  from ..models.job_extraction_schema import JobExtractionSchema
  from ..models.job_failure import JobFailure
  from ..models.job_progress import JobProgress
  from ..models.job_related_extractions_item import JobRelatedExtractionsItem
  from ..models.parsed_document import ParsedDocument
  from ..models.raw_parse_result import RawParseResult





T = TypeVar("T", bound="Job")



@_attrs_define
class Job:
    """
        Attributes:
            id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
            operation (JobOperation):
            status (JobStatus): Durable job status. For batch parent jobs, status is derived from children after each
                child transition:
                1. If any child is non-terminal, the parent remains `queued` only while every child is
                   queued; it becomes `running` once any child is running or terminal.
                2. When every child is terminal and any child is `indeterminate`, the parent is
                   `indeterminate`.
                3. When every child is terminal, none are `indeterminate`, and any child is `failed`:
                   the parent is `failed` if zero children succeeded, otherwise `succeeded` (mixed
                   success/failure closes as parent `succeeded` while preserving failed children in
                   summaries).
                4. When every child is `succeeded`, the parent is `succeeded`.

                Partial failures are always retained on child summaries; parent status does not drop
                failed children from results.
            output_format (OcrOutputFormat):
            created_at (datetime.datetime):
            updated_at (datetime.datetime):
            pipeline_id (None | str): Snapshot of the saved extraction pipeline id at admit time, or `null` for parse jobs,
                inline extract config, and other non-pipeline work.
            pipeline_version (int | None): Snapshot of the saved extraction pipeline version at admit time, or `null` when
                `pipeline_id` is `null`.
            progress (JobProgress | Unset):
            error (JobFailure | Unset):
            result (ExtractionTerminalResult | ParsedDocument | RawParseResult | Unset): Terminal result for single-item
                parse or extract jobs.
            summary (BatchSummaryCounts | Unset):
            children (BatchChildPage | Unset):
            has_source (bool | Unset):
            source_media_type (None | str | Unset):
            source_parse_job_id (None | str | Unset):
            related_extractions (list[JobRelatedExtractionsItem] | Unset):
            extraction_schema (JobExtractionSchema | Unset):
            ocr_model (None | str | Unset): OCR model used at admit time when recorded. Omitted when unknown. Jobs do not
                expose a durable OCR options snapshot.
     """

    id: str
    operation: JobOperation
    status: JobStatus
    output_format: OcrOutputFormat
    created_at: datetime.datetime
    updated_at: datetime.datetime
    pipeline_id: None | str
    pipeline_version: int | None
    progress: JobProgress | Unset = UNSET
    error: JobFailure | Unset = UNSET
    result: ExtractionTerminalResult | ParsedDocument | RawParseResult | Unset = UNSET
    summary: BatchSummaryCounts | Unset = UNSET
    children: BatchChildPage | Unset = UNSET
    has_source: bool | Unset = UNSET
    source_media_type: None | str | Unset = UNSET
    source_parse_job_id: None | str | Unset = UNSET
    related_extractions: list[JobRelatedExtractionsItem] | Unset = UNSET
    extraction_schema: JobExtractionSchema | Unset = UNSET
    ocr_model: None | str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.batch_child_page import BatchChildPage
        from ..models.batch_summary_counts import BatchSummaryCounts
        from ..models.extraction_terminal_result import ExtractionTerminalResult
        from ..models.job_extraction_schema import JobExtractionSchema
        from ..models.job_failure import JobFailure
        from ..models.job_progress import JobProgress
        from ..models.job_related_extractions_item import JobRelatedExtractionsItem
        from ..models.parsed_document import ParsedDocument
        from ..models.raw_parse_result import RawParseResult
        id = self.id

        operation = self.operation.value

        status = self.status.value

        output_format = self.output_format.value

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        pipeline_id: None | str
        pipeline_id = self.pipeline_id

        pipeline_version: int | None
        pipeline_version = self.pipeline_version

        progress: dict[str, Any] | Unset = UNSET
        if not isinstance(self.progress, Unset):
            progress = self.progress.to_dict()

        error: dict[str, Any] | Unset = UNSET
        if not isinstance(self.error, Unset):
            error = self.error.to_dict()

        result: dict[str, Any] | Unset
        if isinstance(self.result, Unset):
            result = UNSET
        elif isinstance(self.result, ParsedDocument):
            result = self.result.to_dict()
        elif isinstance(self.result, RawParseResult):
            result = self.result.to_dict()
        else:
            result = self.result.to_dict()


        summary: dict[str, Any] | Unset = UNSET
        if not isinstance(self.summary, Unset):
            summary = self.summary.to_dict()

        children: dict[str, Any] | Unset = UNSET
        if not isinstance(self.children, Unset):
            children = self.children.to_dict()

        has_source = self.has_source

        source_media_type: None | str | Unset
        if isinstance(self.source_media_type, Unset):
            source_media_type = UNSET
        else:
            source_media_type = self.source_media_type

        source_parse_job_id: None | str | Unset
        if isinstance(self.source_parse_job_id, Unset):
            source_parse_job_id = UNSET
        else:
            source_parse_job_id = self.source_parse_job_id

        related_extractions: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.related_extractions, Unset):
            related_extractions = []
            for related_extractions_item_data in self.related_extractions:
                related_extractions_item = related_extractions_item_data.to_dict()
                related_extractions.append(related_extractions_item)



        extraction_schema: dict[str, Any] | Unset = UNSET
        if not isinstance(self.extraction_schema, Unset):
            extraction_schema = self.extraction_schema.to_dict()

        ocr_model: None | str | Unset
        if isinstance(self.ocr_model, Unset):
            ocr_model = UNSET
        else:
            ocr_model = self.ocr_model


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "operation": operation,
            "status": status,
            "output_format": output_format,
            "created_at": created_at,
            "updated_at": updated_at,
            "pipeline_id": pipeline_id,
            "pipeline_version": pipeline_version,
        })
        if progress is not UNSET:
            field_dict["progress"] = progress
        if error is not UNSET:
            field_dict["error"] = error
        if result is not UNSET:
            field_dict["result"] = result
        if summary is not UNSET:
            field_dict["summary"] = summary
        if children is not UNSET:
            field_dict["children"] = children
        if has_source is not UNSET:
            field_dict["has_source"] = has_source
        if source_media_type is not UNSET:
            field_dict["source_media_type"] = source_media_type
        if source_parse_job_id is not UNSET:
            field_dict["source_parse_job_id"] = source_parse_job_id
        if related_extractions is not UNSET:
            field_dict["related_extractions"] = related_extractions
        if extraction_schema is not UNSET:
            field_dict["extraction_schema"] = extraction_schema
        if ocr_model is not UNSET:
            field_dict["ocr_model"] = ocr_model

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.batch_child_page import BatchChildPage
        from ..models.batch_summary_counts import BatchSummaryCounts
        from ..models.extraction_terminal_result import ExtractionTerminalResult
        from ..models.job_extraction_schema import JobExtractionSchema
        from ..models.job_failure import JobFailure
        from ..models.job_progress import JobProgress
        from ..models.job_related_extractions_item import JobRelatedExtractionsItem
        from ..models.parsed_document import ParsedDocument
        from ..models.raw_parse_result import RawParseResult
        d = dict(src_dict)
        id = d.pop("id")

        operation = JobOperation(d.pop("operation"))




        status = JobStatus(d.pop("status"))




        output_format = OcrOutputFormat(d.pop("output_format"))




        created_at = isoparse(d.pop("created_at"))




        updated_at = isoparse(d.pop("updated_at"))




        def _parse_pipeline_id(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        pipeline_id = _parse_pipeline_id(d.pop("pipeline_id"))


        def _parse_pipeline_version(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        pipeline_version = _parse_pipeline_version(d.pop("pipeline_version"))


        _progress = d.pop("progress", UNSET)
        progress: JobProgress | Unset
        if isinstance(_progress,  Unset):
            progress = UNSET
        else:
            progress = JobProgress.from_dict(_progress)




        _error = d.pop("error", UNSET)
        error: JobFailure | Unset
        if isinstance(_error,  Unset):
            error = UNSET
        else:
            error = JobFailure.from_dict(_error)




        def _parse_result(data: object) -> ExtractionTerminalResult | ParsedDocument | RawParseResult | Unset:
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                result_type_0 = ParsedDocument.from_dict(data)



                return result_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                result_type_1 = RawParseResult.from_dict(data)



                return result_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            if not isinstance(data, dict):
                raise TypeError()
            result_type_2 = ExtractionTerminalResult.from_dict(data)



            return result_type_2

        result = _parse_result(d.pop("result", UNSET))


        _summary = d.pop("summary", UNSET)
        summary: BatchSummaryCounts | Unset
        if isinstance(_summary,  Unset):
            summary = UNSET
        else:
            summary = BatchSummaryCounts.from_dict(_summary)




        _children = d.pop("children", UNSET)
        children: BatchChildPage | Unset
        if isinstance(_children,  Unset):
            children = UNSET
        else:
            children = BatchChildPage.from_dict(_children)




        has_source = d.pop("has_source", UNSET)

        def _parse_source_media_type(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        source_media_type = _parse_source_media_type(d.pop("source_media_type", UNSET))


        def _parse_source_parse_job_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        source_parse_job_id = _parse_source_parse_job_id(d.pop("source_parse_job_id", UNSET))


        _related_extractions = d.pop("related_extractions", UNSET)
        related_extractions: list[JobRelatedExtractionsItem] | Unset = UNSET
        if _related_extractions is not UNSET:
            related_extractions = []
            for related_extractions_item_data in _related_extractions:
                related_extractions_item = JobRelatedExtractionsItem.from_dict(related_extractions_item_data)



                related_extractions.append(related_extractions_item)


        _extraction_schema = d.pop("extraction_schema", UNSET)
        extraction_schema: JobExtractionSchema | Unset
        if isinstance(_extraction_schema,  Unset):
            extraction_schema = UNSET
        else:
            extraction_schema = JobExtractionSchema.from_dict(_extraction_schema)




        def _parse_ocr_model(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        ocr_model = _parse_ocr_model(d.pop("ocr_model", UNSET))


        job = cls(
            id=id,
            operation=operation,
            status=status,
            output_format=output_format,
            created_at=created_at,
            updated_at=updated_at,
            pipeline_id=pipeline_id,
            pipeline_version=pipeline_version,
            progress=progress,
            error=error,
            result=result,
            summary=summary,
            children=children,
            has_source=has_source,
            source_media_type=source_media_type,
            source_parse_job_id=source_parse_job_id,
            related_extractions=related_extractions,
            extraction_schema=extraction_schema,
            ocr_model=ocr_model,
        )

        return job
