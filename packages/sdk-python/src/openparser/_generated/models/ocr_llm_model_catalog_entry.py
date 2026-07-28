from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.ocr_llm_model_catalog_entry_recommendation import OcrLlmModelCatalogEntryRecommendation
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.ocr_llm_model_catalog_entry_pricing import OcrLlmModelCatalogEntryPricing
  from ..models.ocr_llm_model_catalog_entry_reasoning_type_0 import OcrLlmModelCatalogEntryReasoningType0





T = TypeVar("T", bound="OcrLlmModelCatalogEntry")



@_attrs_define
class OcrLlmModelCatalogEntry:
    """ One compatible extraction LLM. `recommendation` is `suggested` or `compatible`.
    `certified_grounding` / `certified_suggest` (and compatibility aliases
    `supports_grounding` / `supports_suggest`) gate heavier schemas. `pricing` is customer retail USD per 1M tokens
    (`basis: customer_retail`) — the rates customers are charged, not raw provider list cost.

        Attributes:
            id (str):
            label (str):
            provider (str):
            created_at (datetime.datetime | None):
            context_length (int | None):
            recommendation (OcrLlmModelCatalogEntryRecommendation):
            is_default (bool):
            certified_grounding (bool):
            certified_suggest (bool):
            supports_grounding (bool):
            supports_suggest (bool):
            pricing_known (bool):
            reasoning (None | OcrLlmModelCatalogEntryReasoningType0):
            deprecated_at (datetime.datetime | None):
            pricing (OcrLlmModelCatalogEntryPricing):
     """

    id: str
    label: str
    provider: str
    created_at: datetime.datetime | None
    context_length: int | None
    recommendation: OcrLlmModelCatalogEntryRecommendation
    is_default: bool
    certified_grounding: bool
    certified_suggest: bool
    supports_grounding: bool
    supports_suggest: bool
    pricing_known: bool
    reasoning: None | OcrLlmModelCatalogEntryReasoningType0
    deprecated_at: datetime.datetime | None
    pricing: OcrLlmModelCatalogEntryPricing





    def to_dict(self) -> dict[str, Any]:
        from ..models.ocr_llm_model_catalog_entry_pricing import OcrLlmModelCatalogEntryPricing
        from ..models.ocr_llm_model_catalog_entry_reasoning_type_0 import OcrLlmModelCatalogEntryReasoningType0
        id = self.id

        label = self.label

        provider = self.provider

        created_at: None | str
        if isinstance(self.created_at, datetime.datetime):
            created_at = self.created_at.isoformat()
        else:
            created_at = self.created_at

        context_length: int | None
        context_length = self.context_length

        recommendation = self.recommendation.value

        is_default = self.is_default

        certified_grounding = self.certified_grounding

        certified_suggest = self.certified_suggest

        supports_grounding = self.supports_grounding

        supports_suggest = self.supports_suggest

        pricing_known = self.pricing_known

        reasoning: dict[str, Any] | None
        if isinstance(self.reasoning, OcrLlmModelCatalogEntryReasoningType0):
            reasoning = self.reasoning.to_dict()
        else:
            reasoning = self.reasoning

        deprecated_at: None | str
        if isinstance(self.deprecated_at, datetime.datetime):
            deprecated_at = self.deprecated_at.isoformat()
        else:
            deprecated_at = self.deprecated_at

        pricing = self.pricing.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "label": label,
            "provider": provider,
            "created_at": created_at,
            "context_length": context_length,
            "recommendation": recommendation,
            "is_default": is_default,
            "certified_grounding": certified_grounding,
            "certified_suggest": certified_suggest,
            "supports_grounding": supports_grounding,
            "supports_suggest": supports_suggest,
            "pricing_known": pricing_known,
            "reasoning": reasoning,
            "deprecated_at": deprecated_at,
            "pricing": pricing,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ocr_llm_model_catalog_entry_pricing import OcrLlmModelCatalogEntryPricing
        from ..models.ocr_llm_model_catalog_entry_reasoning_type_0 import OcrLlmModelCatalogEntryReasoningType0
        d = dict(src_dict)
        id = d.pop("id")

        label = d.pop("label")

        provider = d.pop("provider")

        def _parse_created_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                created_at_type_0 = isoparse(data)



                return created_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        created_at = _parse_created_at(d.pop("created_at"))


        def _parse_context_length(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        context_length = _parse_context_length(d.pop("context_length"))


        recommendation = OcrLlmModelCatalogEntryRecommendation(d.pop("recommendation"))




        is_default = d.pop("is_default")

        certified_grounding = d.pop("certified_grounding")

        certified_suggest = d.pop("certified_suggest")

        supports_grounding = d.pop("supports_grounding")

        supports_suggest = d.pop("supports_suggest")

        pricing_known = d.pop("pricing_known")

        def _parse_reasoning(data: object) -> None | OcrLlmModelCatalogEntryReasoningType0:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                reasoning_type_0 = OcrLlmModelCatalogEntryReasoningType0.from_dict(data)



                return reasoning_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | OcrLlmModelCatalogEntryReasoningType0, data)

        reasoning = _parse_reasoning(d.pop("reasoning"))


        def _parse_deprecated_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                deprecated_at_type_0 = isoparse(data)



                return deprecated_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        deprecated_at = _parse_deprecated_at(d.pop("deprecated_at"))


        pricing = OcrLlmModelCatalogEntryPricing.from_dict(d.pop("pricing"))




        ocr_llm_model_catalog_entry = cls(
            id=id,
            label=label,
            provider=provider,
            created_at=created_at,
            context_length=context_length,
            recommendation=recommendation,
            is_default=is_default,
            certified_grounding=certified_grounding,
            certified_suggest=certified_suggest,
            supports_grounding=supports_grounding,
            supports_suggest=supports_suggest,
            pricing_known=pricing_known,
            reasoning=reasoning,
            deprecated_at=deprecated_at,
            pricing=pricing,
        )

        return ocr_llm_model_catalog_entry
