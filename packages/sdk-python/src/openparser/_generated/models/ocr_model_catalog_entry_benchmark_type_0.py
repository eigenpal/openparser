from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="OcrModelCatalogEntryBenchmarkType0")



@_attrs_define
class OcrModelCatalogEntryBenchmarkType0:
    """
        Attributes:
            score (float):
            version (str):
            qualification (str):
            source_url (str):
     """

    score: float
    version: str
    qualification: str
    source_url: str





    def to_dict(self) -> dict[str, Any]:
        score = self.score

        version = self.version

        qualification = self.qualification

        source_url = self.source_url


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "score": score,
            "version": version,
            "qualification": qualification,
            "source_url": source_url,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        score = d.pop("score")

        version = d.pop("version")

        qualification = d.pop("qualification")

        source_url = d.pop("source_url")

        ocr_model_catalog_entry_benchmark_type_0 = cls(
            score=score,
            version=version,
            qualification=qualification,
            source_url=source_url,
        )

        return ocr_model_catalog_entry_benchmark_type_0
