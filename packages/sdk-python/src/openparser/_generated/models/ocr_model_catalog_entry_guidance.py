from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="OcrModelCatalogEntryGuidance")



@_attrs_define
class OcrModelCatalogEntryGuidance:
    """
        Attributes:
            summary (str):
            best_for (str):
            trade_off (str):
            output (str):
     """

    summary: str
    best_for: str
    trade_off: str
    output: str





    def to_dict(self) -> dict[str, Any]:
        summary = self.summary

        best_for = self.best_for

        trade_off = self.trade_off

        output = self.output


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "summary": summary,
            "best_for": best_for,
            "trade_off": trade_off,
            "output": output,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        summary = d.pop("summary")

        best_for = d.pop("best_for")

        trade_off = d.pop("trade_off")

        output = d.pop("output")

        ocr_model_catalog_entry_guidance = cls(
            summary=summary,
            best_for=best_for,
            trade_off=trade_off,
            output=output,
        )

        return ocr_model_catalog_entry_guidance
