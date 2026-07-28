from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.ocr_llm_models_response_mode import OcrLlmModelsResponseMode
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.ocr_llm_model_catalog_entry import OcrLlmModelCatalogEntry





T = TypeVar("T", bound="OcrLlmModelsResponse")



@_attrs_define
class OcrLlmModelsResponse:
    """ Normalized OpenRouter LLM catalog for OpenParser extraction. Includes catalog version,
    stale flag, and pagination metadata for search mode.

        Attributes:
            mode (OcrLlmModelsResponseMode):
            catalog_version (str):
            fetched_at (datetime.datetime):
            stale (bool):
            data (list[OcrLlmModelCatalogEntry]):
            page (int):
            limit (int):
            total (int):
            has_more (bool):
     """

    mode: OcrLlmModelsResponseMode
    catalog_version: str
    fetched_at: datetime.datetime
    stale: bool
    data: list[OcrLlmModelCatalogEntry]
    page: int
    limit: int
    total: int
    has_more: bool





    def to_dict(self) -> dict[str, Any]:
        from ..models.ocr_llm_model_catalog_entry import OcrLlmModelCatalogEntry
        mode = self.mode.value

        catalog_version = self.catalog_version

        fetched_at = self.fetched_at.isoformat()

        stale = self.stale

        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)



        page = self.page

        limit = self.limit

        total = self.total

        has_more = self.has_more


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "mode": mode,
            "catalog_version": catalog_version,
            "fetched_at": fetched_at,
            "stale": stale,
            "data": data,
            "page": page,
            "limit": limit,
            "total": total,
            "has_more": has_more,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ocr_llm_model_catalog_entry import OcrLlmModelCatalogEntry
        d = dict(src_dict)
        mode = OcrLlmModelsResponseMode(d.pop("mode"))




        catalog_version = d.pop("catalog_version")

        fetched_at = isoparse(d.pop("fetched_at"))




        stale = d.pop("stale")

        data = []
        _data = d.pop("data")
        for data_item_data in (_data):
            data_item = OcrLlmModelCatalogEntry.from_dict(data_item_data)



            data.append(data_item)


        page = d.pop("page")

        limit = d.pop("limit")

        total = d.pop("total")

        has_more = d.pop("has_more")

        ocr_llm_models_response = cls(
            mode=mode,
            catalog_version=catalog_version,
            fetched_at=fetched_at,
            stale=stale,
            data=data,
            page=page,
            limit=limit,
            total=total,
            has_more=has_more,
        )

        return ocr_llm_models_response
