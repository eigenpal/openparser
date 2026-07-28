from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.parse_request_output_format import ParseRequestOutputFormat
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.parse_request_ocr_options import ParseRequestOcrOptions





T = TypeVar("T", bound="ParseRequest")



@_attrs_define
class ParseRequest:
    """
        Attributes:
            ocr_model (str):
            ocr_options (ParseRequestOcrOptions | Unset):
            file_id (str | Unset):
            output_format (ParseRequestOutputFormat | Unset):  Default: ParseRequestOutputFormat.OPENPARSER1.
     """

    ocr_model: str
    ocr_options: ParseRequestOcrOptions | Unset = UNSET
    file_id: str | Unset = UNSET
    output_format: ParseRequestOutputFormat | Unset = ParseRequestOutputFormat.OPENPARSER1





    def to_dict(self) -> dict[str, Any]:
        from ..models.parse_request_ocr_options import ParseRequestOcrOptions
        ocr_model = self.ocr_model

        ocr_options: dict[str, Any] | Unset = UNSET
        if not isinstance(self.ocr_options, Unset):
            ocr_options = self.ocr_options.to_dict()

        file_id = self.file_id

        output_format: str | Unset = UNSET
        if not isinstance(self.output_format, Unset):
            output_format = self.output_format.value



        field_dict: dict[str, Any] = {}

        field_dict.update({
            "ocr_model": ocr_model,
        })
        if ocr_options is not UNSET:
            field_dict["ocr_options"] = ocr_options
        if file_id is not UNSET:
            field_dict["file_id"] = file_id
        if output_format is not UNSET:
            field_dict["output_format"] = output_format

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.parse_request_ocr_options import ParseRequestOcrOptions
        d = dict(src_dict)
        ocr_model = d.pop("ocr_model")

        _ocr_options = d.pop("ocr_options", UNSET)
        ocr_options: ParseRequestOcrOptions | Unset
        if isinstance(_ocr_options,  Unset):
            ocr_options = UNSET
        else:
            ocr_options = ParseRequestOcrOptions.from_dict(_ocr_options)




        file_id = d.pop("file_id", UNSET)

        _output_format = d.pop("output_format", UNSET)
        output_format: ParseRequestOutputFormat | Unset
        if isinstance(_output_format,  Unset):
            output_format = UNSET
        else:
            output_format = ParseRequestOutputFormat(_output_format)




        parse_request = cls(
            ocr_model=ocr_model,
            ocr_options=ocr_options,
            file_id=file_id,
            output_format=output_format,
        )

        return parse_request
