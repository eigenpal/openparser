from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast
from typing import Literal, cast

if TYPE_CHECKING:
  from ..models.paddle_raw_profile import PaddleRawProfile
  from ..models.raw_parse_result_result import RawParseResultResult





T = TypeVar("T", bound="RawParseResult")



@_attrs_define
class RawParseResult:
    """
        Attributes:
            output_format (Literal['raw']):
            provider (Literal['paddle']):
            model (Literal['paddleocr-vl-1.6']):
            profile (PaddleRawProfile):
            result (RawParseResultResult):
     """

    output_format: Literal['raw']
    provider: Literal['paddle']
    model: Literal['paddleocr-vl-1.6']
    profile: PaddleRawProfile
    result: RawParseResultResult





    def to_dict(self) -> dict[str, Any]:
        from ..models.paddle_raw_profile import PaddleRawProfile
        from ..models.raw_parse_result_result import RawParseResultResult
        output_format = self.output_format

        provider = self.provider

        model = self.model

        profile = self.profile.to_dict()

        result = self.result.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "output_format": output_format,
            "provider": provider,
            "model": model,
            "profile": profile,
            "result": result,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.paddle_raw_profile import PaddleRawProfile
        from ..models.raw_parse_result_result import RawParseResultResult
        d = dict(src_dict)
        output_format = cast(Literal['raw'] , d.pop("output_format"))
        if output_format != 'raw':
            raise ValueError(f"output_format must match const 'raw', got '{output_format}'")

        provider = cast(Literal['paddle'] , d.pop("provider"))
        if provider != 'paddle':
            raise ValueError(f"provider must match const 'paddle', got '{provider}'")

        model = cast(Literal['paddleocr-vl-1.6'] , d.pop("model"))
        if model != 'paddleocr-vl-1.6':
            raise ValueError(f"model must match const 'paddleocr-vl-1.6', got '{model}'")

        profile = PaddleRawProfile.from_dict(d.pop("profile"))




        result = RawParseResultResult.from_dict(d.pop("result"))




        raw_parse_result = cls(
            output_format=output_format,
            provider=provider,
            model=model,
            profile=profile,
            result=result,
        )

        return raw_parse_result
