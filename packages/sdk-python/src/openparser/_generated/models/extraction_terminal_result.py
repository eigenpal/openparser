from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.extraction_terminal_result_reasoning_effort_type_0 import ExtractionTerminalResultReasoningEffortType0
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.extraction_attempt import ExtractionAttempt
  from ..models.extraction_grounding_result import ExtractionGroundingResult
  from ..models.extraction_usage_totals import ExtractionUsageTotals
  from ..models.parsed_document import ParsedDocument





T = TypeVar("T", bound="ExtractionTerminalResult")



@_attrs_define
class ExtractionTerminalResult:
    """ Terminal extraction result returned by sync `200` and embedded in succeeded jobs.

        Attributes:
            output (Any): Validated extraction output JSON matching the requested schema (wrappers never leak).
            parsed_document (ParsedDocument): Versioned OpenParser `openparser@1` document graph. `pages` establish
                coordinate spaces;
                `elements` carry semantic payloads and geometry; `relations` preserve hierarchy and
                cross-element meaning; `assets` hold reusable binary references (for example figure URIs).
                Compatible optional fields may be added within version 1; breaking representation changes
                create a new output-format version.
            llm_model (str): OpenRouter model slug from the compatible OCR extraction catalog
                (`GET /models/llm`). Unknown or deprecated values return `422 unsupported_llm_model`.
                Ordinary extract may use any currently compatible model; field grounding requires a
                certified model.
                 Example: openai/gpt-5.6-terra.
            attempts (list[ExtractionAttempt]):
            parse_job_id (str | Unset): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
            reasoning_effort (ExtractionTerminalResultReasoningEffortType0 | None | Unset):
            usage (ExtractionUsageTotals | Unset): Aggregated customer retail OpenRouter usage for transparency. `cost_usd`
                is the
                customer charge, not raw provider list cost. Distinct from the customer
                USD $0.001/page (0.1 credits/page) OCR charge recorded by Eigenpal billing.
            grounding (ExtractionGroundingResult | Unset): Optional terminal grounding envelope present only when
                `grounding: field` succeeded.
     """

    output: Any
    parsed_document: ParsedDocument
    llm_model: str
    attempts: list[ExtractionAttempt]
    parse_job_id: str | Unset = UNSET
    reasoning_effort: ExtractionTerminalResultReasoningEffortType0 | None | Unset = UNSET
    usage: ExtractionUsageTotals | Unset = UNSET
    grounding: ExtractionGroundingResult | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.extraction_attempt import ExtractionAttempt
        from ..models.extraction_grounding_result import ExtractionGroundingResult
        from ..models.extraction_usage_totals import ExtractionUsageTotals
        from ..models.parsed_document import ParsedDocument
        output = self.output

        parsed_document = self.parsed_document.to_dict()

        llm_model = self.llm_model

        attempts = []
        for attempts_item_data in self.attempts:
            attempts_item = attempts_item_data.to_dict()
            attempts.append(attempts_item)



        parse_job_id = self.parse_job_id

        reasoning_effort: None | str | Unset
        if isinstance(self.reasoning_effort, Unset):
            reasoning_effort = UNSET
        elif isinstance(self.reasoning_effort, ExtractionTerminalResultReasoningEffortType0):
            reasoning_effort = self.reasoning_effort.value
        else:
            reasoning_effort = self.reasoning_effort

        usage: dict[str, Any] | Unset = UNSET
        if not isinstance(self.usage, Unset):
            usage = self.usage.to_dict()

        grounding: dict[str, Any] | Unset = UNSET
        if not isinstance(self.grounding, Unset):
            grounding = self.grounding.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "output": output,
            "parsed_document": parsed_document,
            "llm_model": llm_model,
            "attempts": attempts,
        })
        if parse_job_id is not UNSET:
            field_dict["parse_job_id"] = parse_job_id
        if reasoning_effort is not UNSET:
            field_dict["reasoning_effort"] = reasoning_effort
        if usage is not UNSET:
            field_dict["usage"] = usage
        if grounding is not UNSET:
            field_dict["grounding"] = grounding

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.extraction_attempt import ExtractionAttempt
        from ..models.extraction_grounding_result import ExtractionGroundingResult
        from ..models.extraction_usage_totals import ExtractionUsageTotals
        from ..models.parsed_document import ParsedDocument
        d = dict(src_dict)
        output = d.pop("output")

        parsed_document = ParsedDocument.from_dict(d.pop("parsed_document"))




        llm_model = d.pop("llm_model")

        attempts = []
        _attempts = d.pop("attempts")
        for attempts_item_data in (_attempts):
            attempts_item = ExtractionAttempt.from_dict(attempts_item_data)



            attempts.append(attempts_item)


        parse_job_id = d.pop("parse_job_id", UNSET)

        def _parse_reasoning_effort(data: object) -> ExtractionTerminalResultReasoningEffortType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                reasoning_effort_type_0 = ExtractionTerminalResultReasoningEffortType0(data)



                return reasoning_effort_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(ExtractionTerminalResultReasoningEffortType0 | None | Unset, data)

        reasoning_effort = _parse_reasoning_effort(d.pop("reasoning_effort", UNSET))


        _usage = d.pop("usage", UNSET)
        usage: ExtractionUsageTotals | Unset
        if isinstance(_usage,  Unset):
            usage = UNSET
        else:
            usage = ExtractionUsageTotals.from_dict(_usage)




        _grounding = d.pop("grounding", UNSET)
        grounding: ExtractionGroundingResult | Unset
        if isinstance(_grounding,  Unset):
            grounding = UNSET
        else:
            grounding = ExtractionGroundingResult.from_dict(_grounding)




        extraction_terminal_result = cls(
            output=output,
            parsed_document=parsed_document,
            llm_model=llm_model,
            attempts=attempts,
            parse_job_id=parse_job_id,
            reasoning_effort=reasoning_effort,
            usage=usage,
            grounding=grounding,
        )

        return extraction_terminal_result
