from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="ReopenExtractionReviewRequest")



@_attrs_define
class ReopenExtractionReviewRequest:
    """
        Attributes:
            expected_version (int):
     """

    expected_version: int





    def to_dict(self) -> dict[str, Any]:
        expected_version = self.expected_version


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "expected_version": expected_version,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        expected_version = d.pop("expected_version")

        reopen_extraction_review_request = cls(
            expected_version=expected_version,
        )

        return reopen_extraction_review_request
