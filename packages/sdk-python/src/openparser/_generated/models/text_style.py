from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.text_style_font_size_unit import TextStyleFontSizeUnit
from ..types import UNSET, Unset






T = TypeVar("T", bound="TextStyle")



@_attrs_define
class TextStyle:
    """
        Attributes:
            font_family (str | Unset):
            font_size (float | Unset):
            font_size_unit (TextStyleFontSizeUnit | Unset):
            font_weight (int | Unset):
            bold (bool | Unset):
            italic (bool | Unset):
            underline (bool | Unset):
            strikethrough (bool | Unset):
            handwritten (bool | Unset):
            monospace (bool | Unset):
            small_caps (bool | Unset):
            superscript (bool | Unset):
            subscript (bool | Unset):
            foreground_color (str | Unset):
            background_color (str | Unset):
     """

    font_family: str | Unset = UNSET
    font_size: float | Unset = UNSET
    font_size_unit: TextStyleFontSizeUnit | Unset = UNSET
    font_weight: int | Unset = UNSET
    bold: bool | Unset = UNSET
    italic: bool | Unset = UNSET
    underline: bool | Unset = UNSET
    strikethrough: bool | Unset = UNSET
    handwritten: bool | Unset = UNSET
    monospace: bool | Unset = UNSET
    small_caps: bool | Unset = UNSET
    superscript: bool | Unset = UNSET
    subscript: bool | Unset = UNSET
    foreground_color: str | Unset = UNSET
    background_color: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        font_family = self.font_family

        font_size = self.font_size

        font_size_unit: str | Unset = UNSET
        if not isinstance(self.font_size_unit, Unset):
            font_size_unit = self.font_size_unit.value


        font_weight = self.font_weight

        bold = self.bold

        italic = self.italic

        underline = self.underline

        strikethrough = self.strikethrough

        handwritten = self.handwritten

        monospace = self.monospace

        small_caps = self.small_caps

        superscript = self.superscript

        subscript = self.subscript

        foreground_color = self.foreground_color

        background_color = self.background_color


        field_dict: dict[str, Any] = {}

        field_dict.update({
        })
        if font_family is not UNSET:
            field_dict["font_family"] = font_family
        if font_size is not UNSET:
            field_dict["font_size"] = font_size
        if font_size_unit is not UNSET:
            field_dict["font_size_unit"] = font_size_unit
        if font_weight is not UNSET:
            field_dict["font_weight"] = font_weight
        if bold is not UNSET:
            field_dict["bold"] = bold
        if italic is not UNSET:
            field_dict["italic"] = italic
        if underline is not UNSET:
            field_dict["underline"] = underline
        if strikethrough is not UNSET:
            field_dict["strikethrough"] = strikethrough
        if handwritten is not UNSET:
            field_dict["handwritten"] = handwritten
        if monospace is not UNSET:
            field_dict["monospace"] = monospace
        if small_caps is not UNSET:
            field_dict["small_caps"] = small_caps
        if superscript is not UNSET:
            field_dict["superscript"] = superscript
        if subscript is not UNSET:
            field_dict["subscript"] = subscript
        if foreground_color is not UNSET:
            field_dict["foreground_color"] = foreground_color
        if background_color is not UNSET:
            field_dict["background_color"] = background_color

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        font_family = d.pop("font_family", UNSET)

        font_size = d.pop("font_size", UNSET)

        _font_size_unit = d.pop("font_size_unit", UNSET)
        font_size_unit: TextStyleFontSizeUnit | Unset
        if isinstance(_font_size_unit,  Unset):
            font_size_unit = UNSET
        else:
            font_size_unit = TextStyleFontSizeUnit(_font_size_unit)




        font_weight = d.pop("font_weight", UNSET)

        bold = d.pop("bold", UNSET)

        italic = d.pop("italic", UNSET)

        underline = d.pop("underline", UNSET)

        strikethrough = d.pop("strikethrough", UNSET)

        handwritten = d.pop("handwritten", UNSET)

        monospace = d.pop("monospace", UNSET)

        small_caps = d.pop("small_caps", UNSET)

        superscript = d.pop("superscript", UNSET)

        subscript = d.pop("subscript", UNSET)

        foreground_color = d.pop("foreground_color", UNSET)

        background_color = d.pop("background_color", UNSET)

        text_style = cls(
            font_family=font_family,
            font_size=font_size,
            font_size_unit=font_size_unit,
            font_weight=font_weight,
            bold=bold,
            italic=italic,
            underline=underline,
            strikethrough=strikethrough,
            handwritten=handwritten,
            monospace=monospace,
            small_caps=small_caps,
            superscript=superscript,
            subscript=subscript,
            foreground_color=foreground_color,
            background_color=background_color,
        )

        return text_style
