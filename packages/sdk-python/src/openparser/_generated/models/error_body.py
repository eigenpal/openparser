from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.error_body_details import ErrorBodyDetails





T = TypeVar("T", bound="ErrorBody")



@_attrs_define
class ErrorBody:
    """
        Attributes:
            code (str):
            message (str):
            request_id (str):
            retryable (bool):
            details (ErrorBodyDetails | Unset):
     """

    code: str
    message: str
    request_id: str
    retryable: bool
    details: ErrorBodyDetails | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.error_body_details import ErrorBodyDetails
        code = self.code

        message = self.message

        request_id = self.request_id

        retryable = self.retryable

        details: dict[str, Any] | Unset = UNSET
        if not isinstance(self.details, Unset):
            details = self.details.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "code": code,
            "message": message,
            "request_id": request_id,
            "retryable": retryable,
        })
        if details is not UNSET:
            field_dict["details"] = details

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.error_body_details import ErrorBodyDetails
        d = dict(src_dict)
        code = d.pop("code")

        message = d.pop("message")

        request_id = d.pop("request_id")

        retryable = d.pop("retryable")

        _details = d.pop("details", UNSET)
        details: ErrorBodyDetails | Unset
        if isinstance(_details,  Unset):
            details = UNSET
        else:
            details = ErrorBodyDetails.from_dict(_details)




        error_body = cls(
            code=code,
            message=message,
            request_id=request_id,
            retryable=retryable,
            details=details,
        )

        return error_body
