from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.job_status import JobStatus
from ..models.ocr_output_format import OcrOutputFormat
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.extraction_terminal_result import ExtractionTerminalResult
  from ..models.job_failure import JobFailure
  from ..models.parsed_document import ParsedDocument
  from ..models.raw_parse_result import RawParseResult





T = TypeVar("T", bound="BatchChildSummary")



@_attrs_define
class BatchChildSummary:
    """
        Attributes:
            client_item_id (str):
            job_id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
            file_index (int):
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
            error (JobFailure | Unset):
            result (ExtractionTerminalResult | ParsedDocument | RawParseResult | Unset): Terminal child result when `status`
                is `succeeded`.
     """

    client_item_id: str
    job_id: str
    file_index: int
    status: JobStatus
    output_format: OcrOutputFormat
    error: JobFailure | Unset = UNSET
    result: ExtractionTerminalResult | ParsedDocument | RawParseResult | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.extraction_terminal_result import ExtractionTerminalResult
        from ..models.job_failure import JobFailure
        from ..models.parsed_document import ParsedDocument
        from ..models.raw_parse_result import RawParseResult
        client_item_id = self.client_item_id

        job_id = self.job_id

        file_index = self.file_index

        status = self.status.value

        output_format = self.output_format.value

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



        field_dict: dict[str, Any] = {}

        field_dict.update({
            "client_item_id": client_item_id,
            "job_id": job_id,
            "file_index": file_index,
            "status": status,
            "output_format": output_format,
        })
        if error is not UNSET:
            field_dict["error"] = error
        if result is not UNSET:
            field_dict["result"] = result

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.extraction_terminal_result import ExtractionTerminalResult
        from ..models.job_failure import JobFailure
        from ..models.parsed_document import ParsedDocument
        from ..models.raw_parse_result import RawParseResult
        d = dict(src_dict)
        client_item_id = d.pop("client_item_id")

        job_id = d.pop("job_id")

        file_index = d.pop("file_index")

        status = JobStatus(d.pop("status"))




        output_format = OcrOutputFormat(d.pop("output_format"))




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


        batch_child_summary = cls(
            client_item_id=client_item_id,
            job_id=job_id,
            file_index=file_index,
            status=status,
            output_format=output_format,
            error=error,
            result=result,
        )

        return batch_child_summary
