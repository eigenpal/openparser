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
  from ..models.parse_request import ParseRequest





T = TypeVar("T", bound="ParseSyncBody")



@_attrs_define
class ParseSyncBody:
    """
        Attributes:
            request (ParseRequest):
            file (File | Unset): Source document bytes (PDF, PNG, or JPEG). Required unless `request.file_id`
                references an existing Eigenpal reusable file.
     """

    request: ParseRequest
    file: File | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.parse_request import ParseRequest
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
        from ..models.parse_request import ParseRequest
        files: types.RequestFiles = []

        files.append(("request", (None, json.dumps( self.request.to_dict()).encode(), "application/json")))



        if not isinstance(self.file, Unset):
            files.append(("file", self.file.to_tuple()))




        for prop_name, prop in self.additional_properties.items():
            files.append((prop_name, (None, str(prop).encode(), "text/plain")))



        return files


    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.parse_request import ParseRequest
        d = dict(src_dict)
        request = ParseRequest.from_dict(d.pop("request"))




        _file = d.pop("file", UNSET)
        file: File | Unset
        if isinstance(_file,  Unset):
            file = UNSET
        else:
            file = File(
             payload = BytesIO(_file)
        )




        parse_sync_body = cls(
            request=request,
            file=file,
        )


        parse_sync_body.additional_properties = d
        return parse_sync_body

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
