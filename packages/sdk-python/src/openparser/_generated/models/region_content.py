from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.content_kind import ContentKind
from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="RegionContent")



@_attrs_define
class RegionContent:
    """
        Attributes:
            region_id (str):
            kind (ContentKind):
            text (None | str | Unset):
            table_html (None | str | Unset):
            detected_state (bool | None | Unset):
            confidence (float | None | Unset):
     """

    region_id: str
    kind: ContentKind
    text: None | str | Unset = UNSET
    table_html: None | str | Unset = UNSET
    detected_state: bool | None | Unset = UNSET
    confidence: float | None | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        region_id = self.region_id

        kind = self.kind.value

        text: None | str | Unset
        if isinstance(self.text, Unset):
            text = UNSET
        else:
            text = self.text

        table_html: None | str | Unset
        if isinstance(self.table_html, Unset):
            table_html = UNSET
        else:
            table_html = self.table_html

        detected_state: bool | None | Unset
        if isinstance(self.detected_state, Unset):
            detected_state = UNSET
        else:
            detected_state = self.detected_state

        confidence: float | None | Unset
        if isinstance(self.confidence, Unset):
            confidence = UNSET
        else:
            confidence = self.confidence


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "region_id": region_id,
            "kind": kind,
        })
        if text is not UNSET:
            field_dict["text"] = text
        if table_html is not UNSET:
            field_dict["table_html"] = table_html
        if detected_state is not UNSET:
            field_dict["detected_state"] = detected_state
        if confidence is not UNSET:
            field_dict["confidence"] = confidence

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        region_id = d.pop("region_id")

        kind = ContentKind(d.pop("kind"))




        def _parse_text(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        text = _parse_text(d.pop("text", UNSET))


        def _parse_table_html(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        table_html = _parse_table_html(d.pop("table_html", UNSET))


        def _parse_detected_state(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        detected_state = _parse_detected_state(d.pop("detected_state", UNSET))


        def _parse_confidence(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        confidence = _parse_confidence(d.pop("confidence", UNSET))


        region_content = cls(
            region_id=region_id,
            kind=kind,
            text=text,
            table_html=table_html,
            detected_state=detected_state,
            confidence=confidence,
        )

        return region_content
