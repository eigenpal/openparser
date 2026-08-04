from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast






T = TypeVar("T", bound="DocumentPageQualityMetricsItem")



@_attrs_define
class DocumentPageQualityMetricsItem:
    """
        Attributes:
            name (str):
            value (bool | float | str):
     """

    name: str
    value: bool | float | str





    def to_dict(self) -> dict[str, Any]:
        name = self.name

        value: bool | float | str
        value = self.value


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "name": name,
            "value": value,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        def _parse_value(data: object) -> bool | float | str:
            return cast(bool | float | str, data)

        value = _parse_value(d.pop("value"))


        document_page_quality_metrics_item = cls(
            name=name,
            value=value,
        )

        return document_page_quality_metrics_item
