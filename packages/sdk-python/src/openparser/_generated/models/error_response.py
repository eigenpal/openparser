from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
  from ..models.error_body import ErrorBody





T = TypeVar("T", bound="ErrorResponse")



@_attrs_define
class ErrorResponse:
    """
        Attributes:
            error (ErrorBody):
     """

    error: ErrorBody





    def to_dict(self) -> dict[str, Any]:
        from ..models.error_body import ErrorBody
        error = self.error.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "error": error,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.error_body import ErrorBody
        d = dict(src_dict)
        error = ErrorBody.from_dict(d.pop("error"))




        error_response = cls(
            error=error,
        )

        return error_response
