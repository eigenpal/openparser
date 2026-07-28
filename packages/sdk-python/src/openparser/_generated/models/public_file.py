from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from dateutil.parser import isoparse
from typing import cast
import datetime






T = TypeVar("T", bound="PublicFile")



@_attrs_define
class PublicFile:
    """
        Attributes:
            id (str):
            filename (str):
            content_type (None | str):
            size (int | None):
            purpose (None):
            created_at (datetime.datetime):
     """

    id: str
    filename: str
    content_type: None | str
    size: int | None
    purpose: None
    created_at: datetime.datetime





    def to_dict(self) -> dict[str, Any]:
        id = self.id

        filename = self.filename

        content_type: None | str
        content_type = self.content_type

        size: int | None
        size = self.size

        purpose = self.purpose

        created_at = self.created_at.isoformat()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "filename": filename,
            "contentType": content_type,
            "size": size,
            "purpose": purpose,
            "createdAt": created_at,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        filename = d.pop("filename")

        def _parse_content_type(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        content_type = _parse_content_type(d.pop("contentType"))


        def _parse_size(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        size = _parse_size(d.pop("size"))


        purpose = d.pop("purpose")

        created_at = isoparse(d.pop("createdAt"))




        public_file = cls(
            id=id,
            filename=filename,
            content_type=content_type,
            size=size,
            purpose=purpose,
            created_at=created_at,
        )

        return public_file
