from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.lineage_digest import LineageDigest
  from ..models.lineage_locator_attributes import LineageLocatorAttributes





T = TypeVar("T", bound="LineageLocator")



@_attrs_define
class LineageLocator:
    """
        Attributes:
            uri (str):
            media_type (str | Unset):
            digest (LineageDigest | Unset):
            attributes (LineageLocatorAttributes | Unset):
     """

    uri: str
    media_type: str | Unset = UNSET
    digest: LineageDigest | Unset = UNSET
    attributes: LineageLocatorAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_digest import LineageDigest
        from ..models.lineage_locator_attributes import LineageLocatorAttributes
        uri = self.uri

        media_type = self.media_type

        digest: dict[str, Any] | Unset = UNSET
        if not isinstance(self.digest, Unset):
            digest = self.digest.to_dict()

        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "uri": uri,
        })
        if media_type is not UNSET:
            field_dict["mediaType"] = media_type
        if digest is not UNSET:
            field_dict["digest"] = digest
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_digest import LineageDigest
        from ..models.lineage_locator_attributes import LineageLocatorAttributes
        d = dict(src_dict)
        uri = d.pop("uri")

        media_type = d.pop("mediaType", UNSET)

        _digest = d.pop("digest", UNSET)
        digest: LineageDigest | Unset
        if isinstance(_digest,  Unset):
            digest = UNSET
        else:
            digest = LineageDigest.from_dict(_digest)




        _attributes = d.pop("attributes", UNSET)
        attributes: LineageLocatorAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageLocatorAttributes.from_dict(_attributes)




        lineage_locator = cls(
            uri=uri,
            media_type=media_type,
            digest=digest,
            attributes=attributes,
        )

        return lineage_locator
