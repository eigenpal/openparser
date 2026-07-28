from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.create_extraction_pipeline_request_llm_options_reasoning_effort_type_1 import CreateExtractionPipelineRequestLlmOptionsReasoningEffortType1
from ..types import UNSET, Unset
from typing import cast
from typing import Literal, cast






T = TypeVar("T", bound="CreateExtractionPipelineRequestLlmOptions")



@_attrs_define
class CreateExtractionPipelineRequestLlmOptions:
    """
        Attributes:
            reasoning_effort (CreateExtractionPipelineRequestLlmOptionsReasoningEffortType1 | Literal['auto'] | Unset):
     """

    reasoning_effort: CreateExtractionPipelineRequestLlmOptionsReasoningEffortType1 | Literal['auto'] | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        reasoning_effort: Literal['auto'] | str | Unset
        if isinstance(self.reasoning_effort, Unset):
            reasoning_effort = UNSET
        elif isinstance(self.reasoning_effort, CreateExtractionPipelineRequestLlmOptionsReasoningEffortType1):
            reasoning_effort = self.reasoning_effort.value
        else:
            reasoning_effort = self.reasoning_effort


        field_dict: dict[str, Any] = {}

        field_dict.update({
        })
        if reasoning_effort is not UNSET:
            field_dict["reasoning_effort"] = reasoning_effort

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        def _parse_reasoning_effort(data: object) -> CreateExtractionPipelineRequestLlmOptionsReasoningEffortType1 | Literal['auto'] | Unset:
            if isinstance(data, Unset):
                return data
            reasoning_effort_type_0 = cast(Literal['auto'] , data)
            if reasoning_effort_type_0 != 'auto':
                raise ValueError(f"reasoning_effort_type_0 must match const 'auto', got '{reasoning_effort_type_0}'")
            return reasoning_effort_type_0
            if not isinstance(data, str):
                raise TypeError()
            reasoning_effort_type_1 = CreateExtractionPipelineRequestLlmOptionsReasoningEffortType1(data)



            return reasoning_effort_type_1

        reasoning_effort = _parse_reasoning_effort(d.pop("reasoning_effort", UNSET))


        create_extraction_pipeline_request_llm_options = cls(
            reasoning_effort=reasoning_effort,
        )

        return create_extraction_pipeline_request_llm_options
