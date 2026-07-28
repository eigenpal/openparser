from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="DeleteExtractionPipelineResponse")



@_attrs_define
class DeleteExtractionPipelineResponse:
    """ Soft-delete acknowledgement.

        Attributes:
            deleted (bool):
            id (str): Prefixed public id for a saved extraction pipeline (`oppl_…`).
     """

    deleted: bool
    id: str





    def to_dict(self) -> dict[str, Any]:
        deleted = self.deleted

        id = self.id


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "deleted": deleted,
            "id": id,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        deleted = d.pop("deleted")

        id = d.pop("id")

        delete_extraction_pipeline_response = cls(
            deleted=deleted,
            id=id,
        )

        return delete_extraction_pipeline_response
