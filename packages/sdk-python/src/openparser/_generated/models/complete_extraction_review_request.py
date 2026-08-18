from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.complete_extraction_review_request_status import CompleteExtractionReviewRequestStatus
from ..types import UNSET, Unset






T = TypeVar("T", bound="CompleteExtractionReviewRequest")



@_attrs_define
class CompleteExtractionReviewRequest:
    """
        Attributes:
            expected_version (int):
            status (CompleteExtractionReviewRequestStatus):
            note (str | Unset):
     """

    expected_version: int
    status: CompleteExtractionReviewRequestStatus
    note: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        expected_version = self.expected_version

        status = self.status.value

        note = self.note


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "expected_version": expected_version,
            "status": status,
        })
        if note is not UNSET:
            field_dict["note"] = note

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        expected_version = d.pop("expected_version")

        status = CompleteExtractionReviewRequestStatus(d.pop("status"))




        note = d.pop("note", UNSET)

        complete_extraction_review_request = cls(
            expected_version=expected_version,
            status=status,
            note=note,
        )

        return complete_extraction_review_request
