from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.ocr_llm_model_catalog_entry_reasoning_type_0_default_effort_type_0 import OcrLlmModelCatalogEntryReasoningType0DefaultEffortType0
from ..models.ocr_llm_model_catalog_entry_reasoning_type_0_supported_efforts_type_0_item import OcrLlmModelCatalogEntryReasoningType0SupportedEffortsType0Item
from typing import cast






T = TypeVar("T", bound="OcrLlmModelCatalogEntryReasoningType0")



@_attrs_define
class OcrLlmModelCatalogEntryReasoningType0:
    """
        Attributes:
            supported_efforts (list[OcrLlmModelCatalogEntryReasoningType0SupportedEffortsType0Item] | None):
            default_effort (None | OcrLlmModelCatalogEntryReasoningType0DefaultEffortType0):
            mandatory (bool):
            supports_max_tokens (bool):
     """

    supported_efforts: list[OcrLlmModelCatalogEntryReasoningType0SupportedEffortsType0Item] | None
    default_effort: None | OcrLlmModelCatalogEntryReasoningType0DefaultEffortType0
    mandatory: bool
    supports_max_tokens: bool





    def to_dict(self) -> dict[str, Any]:
        supported_efforts: list[str] | None
        if isinstance(self.supported_efforts, list):
            supported_efforts = []
            for supported_efforts_type_0_item_data in self.supported_efforts:
                supported_efforts_type_0_item = supported_efforts_type_0_item_data.value
                supported_efforts.append(supported_efforts_type_0_item)


        else:
            supported_efforts = self.supported_efforts

        default_effort: None | str
        if isinstance(self.default_effort, OcrLlmModelCatalogEntryReasoningType0DefaultEffortType0):
            default_effort = self.default_effort.value
        else:
            default_effort = self.default_effort

        mandatory = self.mandatory

        supports_max_tokens = self.supports_max_tokens


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "supported_efforts": supported_efforts,
            "default_effort": default_effort,
            "mandatory": mandatory,
            "supports_max_tokens": supports_max_tokens,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        def _parse_supported_efforts(data: object) -> list[OcrLlmModelCatalogEntryReasoningType0SupportedEffortsType0Item] | None:
            if data is None:
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                supported_efforts_type_0 = []
                _supported_efforts_type_0 = data
                for supported_efforts_type_0_item_data in (_supported_efforts_type_0):
                    supported_efforts_type_0_item = OcrLlmModelCatalogEntryReasoningType0SupportedEffortsType0Item(supported_efforts_type_0_item_data)



                    supported_efforts_type_0.append(supported_efforts_type_0_item)

                return supported_efforts_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[OcrLlmModelCatalogEntryReasoningType0SupportedEffortsType0Item] | None, data)

        supported_efforts = _parse_supported_efforts(d.pop("supported_efforts"))


        def _parse_default_effort(data: object) -> None | OcrLlmModelCatalogEntryReasoningType0DefaultEffortType0:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                default_effort_type_0 = OcrLlmModelCatalogEntryReasoningType0DefaultEffortType0(data)



                return default_effort_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | OcrLlmModelCatalogEntryReasoningType0DefaultEffortType0, data)

        default_effort = _parse_default_effort(d.pop("default_effort"))


        mandatory = d.pop("mandatory")

        supports_max_tokens = d.pop("supports_max_tokens")

        ocr_llm_model_catalog_entry_reasoning_type_0 = cls(
            supported_efforts=supported_efforts,
            default_effort=default_effort,
            mandatory=mandatory,
            supports_max_tokens=supports_max_tokens,
        )

        return ocr_llm_model_catalog_entry_reasoning_type_0
