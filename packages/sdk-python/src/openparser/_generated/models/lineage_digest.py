from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="LineageDigest")



@_attrs_define
class LineageDigest:
    """
        Attributes:
            algorithm (str):
            value (str):
     """

    algorithm: str
    value: str





    def to_dict(self) -> dict[str, Any]:
        algorithm = self.algorithm

        value = self.value


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "algorithm": algorithm,
            "value": value,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        algorithm = d.pop("algorithm")

        value = d.pop("value")

        lineage_digest = cls(
            algorithm=algorithm,
            value=value,
        )

        return lineage_digest
