from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
  from ..models.raw_parse_result_profile_options import RawParseResultProfileOptions





T = TypeVar("T", bound="RawParseResultProfile")



@_attrs_define
class RawParseResultProfile:
    """
        Attributes:
            name (str):
            options (RawParseResultProfileOptions):
     """

    name: str
    options: RawParseResultProfileOptions





    def to_dict(self) -> dict[str, Any]:
        from ..models.raw_parse_result_profile_options import RawParseResultProfileOptions
        name = self.name

        options = self.options.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "name": name,
            "options": options,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.raw_parse_result_profile_options import RawParseResultProfileOptions
        d = dict(src_dict)
        name = d.pop("name")

        options = RawParseResultProfileOptions.from_dict(d.pop("options"))




        raw_parse_result_profile = cls(
            name=name,
            options=options,
        )

        return raw_parse_result_profile
