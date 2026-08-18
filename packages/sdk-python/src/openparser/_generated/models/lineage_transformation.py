from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.lineage_transformation_attributes import LineageTransformationAttributes





T = TypeVar("T", bound="LineageTransformation")



@_attrs_define
class LineageTransformation:
    """
        Attributes:
            type_ (str | Unset):
            description (str | Unset):
            expression (str | Unset):
            masking (bool | Unset):
            attributes (LineageTransformationAttributes | Unset):
     """

    type_: str | Unset = UNSET
    description: str | Unset = UNSET
    expression: str | Unset = UNSET
    masking: bool | Unset = UNSET
    attributes: LineageTransformationAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_transformation_attributes import LineageTransformationAttributes
        type_ = self.type_

        description = self.description

        expression = self.expression

        masking = self.masking

        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
        })
        if type_ is not UNSET:
            field_dict["type"] = type_
        if description is not UNSET:
            field_dict["description"] = description
        if expression is not UNSET:
            field_dict["expression"] = expression
        if masking is not UNSET:
            field_dict["masking"] = masking
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_transformation_attributes import LineageTransformationAttributes
        d = dict(src_dict)
        type_ = d.pop("type", UNSET)

        description = d.pop("description", UNSET)

        expression = d.pop("expression", UNSET)

        masking = d.pop("masking", UNSET)

        _attributes = d.pop("attributes", UNSET)
        attributes: LineageTransformationAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageTransformationAttributes.from_dict(_attributes)




        lineage_transformation = cls(
            type_=type_,
            description=description,
            expression=expression,
            masking=masking,
            attributes=attributes,
        )

        return lineage_transformation
