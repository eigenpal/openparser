from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field
import json
from .. import types

from ..types import UNSET, Unset

from ..types import File, FileTypes
from io import BytesIO






T = TypeVar("T", bound="CreateFileBody")



@_attrs_define
class CreateFileBody:
    """
        Attributes:
            file (File):
     """

    file: File





    def to_dict(self) -> dict[str, Any]:
        file = self.file.to_tuple()



        field_dict: dict[str, Any] = {}

        field_dict.update({
            "file": file,
        })

        return field_dict


    def to_multipart(self) -> types.RequestFiles:
        files: types.RequestFiles = []

        files.append(("file", self.file.to_tuple()))





        return files


    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        file = File(
             payload = BytesIO(d.pop("file"))
        )




        create_file_body = cls(
            file=file,
        )

        return create_file_body
