from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.job_failure_details import JobFailureDetails





T = TypeVar("T", bound="JobFailure")



@_attrs_define
class JobFailure:
    """
        Attributes:
            code (str):
            message (str):
            retryable (bool):
            details (JobFailureDetails | Unset):
     """

    code: str
    message: str
    retryable: bool
    details: JobFailureDetails | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.job_failure_details import JobFailureDetails
        code = self.code

        message = self.message

        retryable = self.retryable

        details: dict[str, Any] | Unset = UNSET
        if not isinstance(self.details, Unset):
            details = self.details.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "code": code,
            "message": message,
            "retryable": retryable,
        })
        if details is not UNSET:
            field_dict["details"] = details

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.job_failure_details import JobFailureDetails
        d = dict(src_dict)
        code = d.pop("code")

        message = d.pop("message")

        retryable = d.pop("retryable")

        _details = d.pop("details", UNSET)
        details: JobFailureDetails | Unset
        if isinstance(_details,  Unset):
            details = UNSET
        else:
            details = JobFailureDetails.from_dict(_details)




        job_failure = cls(
            code=code,
            message=message,
            retryable=retryable,
            details=details,
        )

        return job_failure
