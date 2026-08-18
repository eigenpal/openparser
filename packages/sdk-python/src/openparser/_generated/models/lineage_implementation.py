from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.lineage_implementation_attributes import LineageImplementationAttributes





T = TypeVar("T", bound="LineageImplementation")



@_attrs_define
class LineageImplementation:
    """
        Attributes:
            type_ (str | Unset):
            name (str | Unset):
            version (str | Unset):
            uri (str | Unset):
            attributes (LineageImplementationAttributes | Unset):
     """

    type_: str | Unset = UNSET
    name: str | Unset = UNSET
    version: str | Unset = UNSET
    uri: str | Unset = UNSET
    attributes: LineageImplementationAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_implementation_attributes import LineageImplementationAttributes
        type_ = self.type_

        name = self.name

        version = self.version

        uri = self.uri

        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
        })
        if type_ is not UNSET:
            field_dict["type"] = type_
        if name is not UNSET:
            field_dict["name"] = name
        if version is not UNSET:
            field_dict["version"] = version
        if uri is not UNSET:
            field_dict["uri"] = uri
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_implementation_attributes import LineageImplementationAttributes
        d = dict(src_dict)
        type_ = d.pop("type", UNSET)

        name = d.pop("name", UNSET)

        version = d.pop("version", UNSET)

        uri = d.pop("uri", UNSET)

        _attributes = d.pop("attributes", UNSET)
        attributes: LineageImplementationAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageImplementationAttributes.from_dict(_attributes)




        lineage_implementation = cls(
            type_=type_,
            name=name,
            version=version,
            uri=uri,
            attributes=attributes,
        )

        return lineage_implementation
