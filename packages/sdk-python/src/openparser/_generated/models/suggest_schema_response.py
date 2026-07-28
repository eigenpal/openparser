from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
  from ..models.suggest_schema_response_schema import SuggestSchemaResponseSchema





T = TypeVar("T", bound="SuggestSchemaResponse")



@_attrs_define
class SuggestSchemaResponse:
    """ Suggested extraction schema returned directly without creating a durable job.

        Attributes:
            name (str): Short document-type label proposed by the model.
            schema (SuggestSchemaResponseSchema): Canonical JSON Schema object ready for extract and manual editing.
     """

    name: str
    schema: SuggestSchemaResponseSchema





    def to_dict(self) -> dict[str, Any]:
        from ..models.suggest_schema_response_schema import SuggestSchemaResponseSchema
        name = self.name

        schema = self.schema.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "name": name,
            "schema": schema,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.suggest_schema_response_schema import SuggestSchemaResponseSchema
        d = dict(src_dict)
        name = d.pop("name")

        schema = SuggestSchemaResponseSchema.from_dict(d.pop("schema"))




        suggest_schema_response = cls(
            name=name,
            schema=schema,
        )

        return suggest_schema_response
