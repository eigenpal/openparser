from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.asset_kind import AssetKind
from ..types import UNSET, Unset






T = TypeVar("T", bound="DocumentAsset")



@_attrs_define
class DocumentAsset:
    """
        Attributes:
            id (str):
            kind (AssetKind):
            uri (str | Unset):
            data_base64 (str | Unset):
            mime_type (str | Unset):
            page_number (int | Unset):
            width (float | Unset):
            height (float | Unset):
            sha256 (str | Unset):
     """

    id: str
    kind: AssetKind
    uri: str | Unset = UNSET
    data_base64: str | Unset = UNSET
    mime_type: str | Unset = UNSET
    page_number: int | Unset = UNSET
    width: float | Unset = UNSET
    height: float | Unset = UNSET
    sha256: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        id = self.id

        kind = self.kind.value

        uri = self.uri

        data_base64 = self.data_base64

        mime_type = self.mime_type

        page_number = self.page_number

        width = self.width

        height = self.height

        sha256 = self.sha256


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "kind": kind,
        })
        if uri is not UNSET:
            field_dict["uri"] = uri
        if data_base64 is not UNSET:
            field_dict["data_base64"] = data_base64
        if mime_type is not UNSET:
            field_dict["mime_type"] = mime_type
        if page_number is not UNSET:
            field_dict["page_number"] = page_number
        if width is not UNSET:
            field_dict["width"] = width
        if height is not UNSET:
            field_dict["height"] = height
        if sha256 is not UNSET:
            field_dict["sha256"] = sha256

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        kind = AssetKind(d.pop("kind"))




        uri = d.pop("uri", UNSET)

        data_base64 = d.pop("data_base64", UNSET)

        mime_type = d.pop("mime_type", UNSET)

        page_number = d.pop("page_number", UNSET)

        width = d.pop("width", UNSET)

        height = d.pop("height", UNSET)

        sha256 = d.pop("sha256", UNSET)

        document_asset = cls(
            id=id,
            kind=kind,
            uri=uri,
            data_base64=data_base64,
            mime_type=mime_type,
            page_number=page_number,
            width=width,
            height=height,
            sha256=sha256,
        )

        return document_asset
