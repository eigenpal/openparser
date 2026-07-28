from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.extraction_pipeline_llm_options_reasoning_effort_type_0_type_1 import ExtractionPipelineLlmOptionsReasoningEffortType0Type1
from typing import cast
from typing import Literal, cast






T = TypeVar("T", bound="ExtractionPipelineLlmOptions")



@_attrs_define
class ExtractionPipelineLlmOptions:
    """
        Attributes:
            reasoning_effort (ExtractionPipelineLlmOptionsReasoningEffortType0Type1 | Literal['auto'] | None):
     """

    reasoning_effort: ExtractionPipelineLlmOptionsReasoningEffortType0Type1 | Literal['auto'] | None





    def to_dict(self) -> dict[str, Any]:
        reasoning_effort: Literal['auto'] | None | str
        if isinstance(self.reasoning_effort, ExtractionPipelineLlmOptionsReasoningEffortType0Type1):
            reasoning_effort = self.reasoning_effort.value
        else:
            reasoning_effort = self.reasoning_effort


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "reasoning_effort": reasoning_effort,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        def _parse_reasoning_effort(data: object) -> ExtractionPipelineLlmOptionsReasoningEffortType0Type1 | Literal['auto'] | None:
            if data is None:
                return data
            reasoning_effort_type_0_type_0 = cast(Literal['auto'] , data)
            if reasoning_effort_type_0_type_0 != 'auto':
                raise ValueError(f"reasoning_effort_type_0_type_0 must match const 'auto', got '{reasoning_effort_type_0_type_0}'")
            return reasoning_effort_type_0_type_0
            try:
                if not isinstance(data, str):
                    raise TypeError()
                reasoning_effort_type_0_type_1 = ExtractionPipelineLlmOptionsReasoningEffortType0Type1(data)



                return reasoning_effort_type_0_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(ExtractionPipelineLlmOptionsReasoningEffortType0Type1 | Literal['auto'] | None, data)

        reasoning_effort = _parse_reasoning_effort(d.pop("reasoning_effort"))


        extraction_pipeline_llm_options = cls(
            reasoning_effort=reasoning_effort,
        )

        return extraction_pipeline_llm_options
