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
  from ..models.parse_batch_request import ParseBatchRequest





T = TypeVar("T", bound="ParseBatchBody")



@_attrs_define
class ParseBatchBody:
    """
        Attributes:
            request (ParseBatchRequest):
            files (list[File] | Unset): Ordered uploaded files referenced by `file_index` in the batch request. Each file
                is limited to 50 MiB and total multipart body content is limited to 100 MiB.
                Omit when every batch item supplies `file_id` instead.
     """

    request: ParseBatchRequest
    files: list[File] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.parse_batch_request import ParseBatchRequest
        request = self.request.to_dict()

        files: list[FileTypes] | Unset = UNSET
        if not isinstance(self.files, Unset):
            files = []
            for files_item_data in self.files:
                files_item = files_item_data.to_tuple()

                files.append(files_item)




        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "request": request,
        })
        if files is not UNSET:
            field_dict["files"] = files

        return field_dict


    def to_multipart(self) -> types.RequestFiles:
        from ..models.parse_batch_request import ParseBatchRequest
        files: types.RequestFiles = []

        files.append(("request", (None, json.dumps( self.request.to_dict()).encode(), "application/json")))



        if not isinstance(self.files, Unset):
            for files_item_element in self.files:
                files.append(("files", files_item_element.to_tuple()))





        for prop_name, prop in self.additional_properties.items():
            files.append((prop_name, (None, str(prop).encode(), "text/plain")))



        return files


    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.parse_batch_request import ParseBatchRequest
        d = dict(src_dict)
        request = ParseBatchRequest.from_dict(d.pop("request"))




        _files = d.pop("files", UNSET)
        files: list[File] | Unset = UNSET
        if _files is not UNSET:
            files = []
            for files_item_data in _files:
                files_item = File(
                     payload = BytesIO(files_item_data)
                )



                files.append(files_item)


        parse_batch_body = cls(
            request=request,
            files=files,
        )


        parse_batch_body.additional_properties = d
        return parse_batch_body

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
