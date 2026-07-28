from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast
from typing import Literal, cast

if TYPE_CHECKING:
  from ..models.extraction_grounding_field import ExtractionGroundingField





T = TypeVar("T", bound="ExtractionGroundingResult")



@_attrs_define
class ExtractionGroundingResult:
    """ Optional terminal grounding envelope present only when `grounding: field` succeeded.

        Attributes:
            mode (Literal['field']):
            fields (list[ExtractionGroundingField]):
     """

    mode: Literal['field']
    fields: list[ExtractionGroundingField]





    def to_dict(self) -> dict[str, Any]:
        from ..models.extraction_grounding_field import ExtractionGroundingField
        mode = self.mode

        fields = []
        for fields_item_data in self.fields:
            fields_item = fields_item_data.to_dict()
            fields.append(fields_item)




        field_dict: dict[str, Any] = {}

        field_dict.update({
            "mode": mode,
            "fields": fields,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.extraction_grounding_field import ExtractionGroundingField
        d = dict(src_dict)
        mode = cast(Literal['field'] , d.pop("mode"))
        if mode != 'field':
            raise ValueError(f"mode must match const 'field', got '{mode}'")

        fields = []
        _fields = d.pop("fields")
        for fields_item_data in (_fields):
            fields_item = ExtractionGroundingField.from_dict(fields_item_data)



            fields.append(fields_item)


        extraction_grounding_result = cls(
            mode=mode,
            fields=fields,
        )

        return extraction_grounding_result
