from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="SuggestSchemaRequest")



@_attrs_define
class SuggestSchemaRequest:
    """ Suggest an extraction JSON Schema from a tenant-owned succeeded `parse` job.
    Optional `hint` is caller guidance capped at 500 characters.

        Attributes:
            parse_job_id (str): Prefixed id (`opj_…`) of a succeeded `parse` job in the same tenant.
            hint (str | Unset): Optional free-text guidance for the suggestion model (max 500 characters).
     """

    parse_job_id: str
    hint: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        parse_job_id = self.parse_job_id

        hint = self.hint


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "parse_job_id": parse_job_id,
        })
        if hint is not UNSET:
            field_dict["hint"] = hint

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        parse_job_id = d.pop("parse_job_id")

        hint = d.pop("hint", UNSET)

        suggest_schema_request = cls(
            parse_job_id=parse_job_id,
            hint=hint,
        )

        return suggest_schema_request
