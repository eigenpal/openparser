from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="SourceProvenance")



@_attrs_define
class SourceProvenance:
    """
        Attributes:
            native_id (str | Unset):
            native_type (str | Unset):
            native_label (str | Unset):
     """

    native_id: str | Unset = UNSET
    native_type: str | Unset = UNSET
    native_label: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        native_id = self.native_id

        native_type = self.native_type

        native_label = self.native_label


        field_dict: dict[str, Any] = {}

        field_dict.update({
        })
        if native_id is not UNSET:
            field_dict["native_id"] = native_id
        if native_type is not UNSET:
            field_dict["native_type"] = native_type
        if native_label is not UNSET:
            field_dict["native_label"] = native_label

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        native_id = d.pop("native_id", UNSET)

        native_type = d.pop("native_type", UNSET)

        native_label = d.pop("native_label", UNSET)

        source_provenance = cls(
            native_id=native_id,
            native_type=native_type,
            native_label=native_label,
        )

        return source_provenance
