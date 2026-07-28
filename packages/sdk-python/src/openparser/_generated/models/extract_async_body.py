from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field
import json
from .. import types

from ..types import UNSET, Unset

from ..types import File, FileTypes
from ..types import UNSET, Unset
from io import BytesIO
from typing import cast

if TYPE_CHECKING:
  from ..models.extract_request import ExtractRequest





T = TypeVar("T", bound="ExtractAsyncBody")



@_attrs_define
class ExtractAsyncBody:
    """
        Attributes:
            request (ExtractRequest): Single extract config. Provide either `pipeline_id` or inline extraction config.
                The source is exactly one of multipart file bytes, `file_id`, or tenant-owned succeeded
                `parse_job_id`. Parse reuse is single-extract-only, forbids `ocr_model` / `ocr_options`,
                does not run OCR, and adds no page charge. `parse_job_id` is part of idempotency identity.
            file (File | Unset): Source document bytes (PDF, PNG, or JPEG). Required unless `request.file_id`
                references an existing Eigenpal reusable file.
     """

    request: ExtractRequest
    file: File | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.extract_request import ExtractRequest
        request = self.request.to_dict()

        file: FileTypes | Unset = UNSET
        if not isinstance(self.file, Unset):
            file = self.file.to_tuple()



        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "request": request,
        })
        if file is not UNSET:
            field_dict["file"] = file

        return field_dict


    def to_multipart(self) -> types.RequestFiles:
        from ..models.extract_request import ExtractRequest
        files: types.RequestFiles = []

        files.append(("request", (None, json.dumps( self.request.to_dict()).encode(), "application/json")))



        if not isinstance(self.file, Unset):
            files.append(("file", self.file.to_tuple()))




        for prop_name, prop in self.additional_properties.items():
            files.append((prop_name, (None, str(prop).encode(), "text/plain")))



        return files


    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.extract_request import ExtractRequest
        d = dict(src_dict)
        request = ExtractRequest.from_dict(d.pop("request"))




        _file = d.pop("file", UNSET)
        file: File | Unset
        if isinstance(_file,  Unset):
            file = UNSET
        else:
            file = File(
             payload = BytesIO(_file)
        )




        extract_async_body = cls(
            request=request,
            file=file,
        )


        extract_async_body.additional_properties = d
        return extract_async_body

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
