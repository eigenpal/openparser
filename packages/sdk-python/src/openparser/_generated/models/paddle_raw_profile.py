from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast
from typing import Literal, cast

if TYPE_CHECKING:
  from ..models.paddle_raw_profile_options import PaddleRawProfileOptions





T = TypeVar("T", bound="PaddleRawProfile")



@_attrs_define
class PaddleRawProfile:
    """
        Attributes:
            name (Literal['eigenpal-paddle-layout-v1']):
            options (PaddleRawProfileOptions):
     """

    name: Literal['eigenpal-paddle-layout-v1']
    options: PaddleRawProfileOptions





    def to_dict(self) -> dict[str, Any]:
        from ..models.paddle_raw_profile_options import PaddleRawProfileOptions
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
        from ..models.paddle_raw_profile_options import PaddleRawProfileOptions
        d = dict(src_dict)
        name = cast(Literal['eigenpal-paddle-layout-v1'] , d.pop("name"))
        if name != 'eigenpal-paddle-layout-v1':
            raise ValueError(f"name must match const 'eigenpal-paddle-layout-v1', got '{name}'")

        options = PaddleRawProfileOptions.from_dict(d.pop("options"))




        paddle_raw_profile = cls(
            name=name,
            options=options,
        )

        return paddle_raw_profile
