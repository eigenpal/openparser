from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="DocumentProvenance")



@_attrs_define
class DocumentProvenance:
    """
        Attributes:
            provider (str):
            model (str):
            version (str | Unset):
            operation (str | Unset):
     """

    provider: str
    model: str
    version: str | Unset = UNSET
    operation: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        provider = self.provider

        model = self.model

        version = self.version

        operation = self.operation


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "provider": provider,
            "model": model,
        })
        if version is not UNSET:
            field_dict["version"] = version
        if operation is not UNSET:
            field_dict["operation"] = operation

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        provider = d.pop("provider")

        model = d.pop("model")

        version = d.pop("version", UNSET)

        operation = d.pop("operation", UNSET)

        document_provenance = cls(
            provider=provider,
            model=model,
            version=version,
            operation=operation,
        )

        return document_provenance
