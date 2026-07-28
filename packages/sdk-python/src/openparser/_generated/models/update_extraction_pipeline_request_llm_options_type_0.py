from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.update_extraction_pipeline_request_llm_options_type_0_reasoning_effort_type_1 import UpdateExtractionPipelineRequestLlmOptionsType0ReasoningEffortType1
from ..types import UNSET, Unset
from typing import cast
from typing import Literal, cast






T = TypeVar("T", bound="UpdateExtractionPipelineRequestLlmOptionsType0")



@_attrs_define
class UpdateExtractionPipelineRequestLlmOptionsType0:
    """
        Attributes:
            reasoning_effort (Literal['auto'] | Unset | UpdateExtractionPipelineRequestLlmOptionsType0ReasoningEffortType1):
     """

    reasoning_effort: Literal['auto'] | Unset | UpdateExtractionPipelineRequestLlmOptionsType0ReasoningEffortType1 = UNSET





    def to_dict(self) -> dict[str, Any]:
        reasoning_effort: Literal['auto'] | str | Unset
        if isinstance(self.reasoning_effort, Unset):
            reasoning_effort = UNSET
        elif isinstance(self.reasoning_effort, UpdateExtractionPipelineRequestLlmOptionsType0ReasoningEffortType1):
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
        def _parse_reasoning_effort(data: object) -> Literal['auto'] | Unset | UpdateExtractionPipelineRequestLlmOptionsType0ReasoningEffortType1:
            if isinstance(data, Unset):
                return data
            reasoning_effort_type_0 = cast(Literal['auto'] , data)
            if reasoning_effort_type_0 != 'auto':
                raise ValueError(f"reasoning_effort_type_0 must match const 'auto', got '{reasoning_effort_type_0}'")
            return reasoning_effort_type_0
            if not isinstance(data, str):
                raise TypeError()
            reasoning_effort_type_1 = UpdateExtractionPipelineRequestLlmOptionsType0ReasoningEffortType1(data)



            return reasoning_effort_type_1

        reasoning_effort = _parse_reasoning_effort(d.pop("reasoning_effort", UNSET))


        update_extraction_pipeline_request_llm_options_type_0 = cls(
            reasoning_effort=reasoning_effort,
        )

        return update_extraction_pipeline_request_llm_options_type_0
