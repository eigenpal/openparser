from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
from typing import Literal, cast
import datetime






T = TypeVar("T", bound="ExtractionReviewEventType0")



@_attrs_define
class ExtractionReviewEventType0:
    """
        Attributes:
            version (int):
            actor_id (str):
            created_at (datetime.datetime):
            type_ (Literal['field_confirmed']):
            path (str):
            value (Any):
            previous_value (Any | Unset):
            note (str | Unset):
     """

    version: int
    actor_id: str
    created_at: datetime.datetime
    type_: Literal['field_confirmed']
    path: str
    value: Any
    previous_value: Any | Unset = UNSET
    note: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        version = self.version

        actor_id = self.actor_id

        created_at = self.created_at.isoformat()

        type_ = self.type_

        path = self.path

        value = self.value

        previous_value = self.previous_value

        note = self.note


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "version": version,
            "actor_id": actor_id,
            "created_at": created_at,
            "type": type_,
            "path": path,
            "value": value,
        })
        if previous_value is not UNSET:
            field_dict["previous_value"] = previous_value
        if note is not UNSET:
            field_dict["note"] = note

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        version = d.pop("version")

        actor_id = d.pop("actor_id")

        created_at = isoparse(d.pop("created_at"))




        type_ = cast(Literal['field_confirmed'] , d.pop("type"))
        if type_ != 'field_confirmed':
            raise ValueError(f"type must match const 'field_confirmed', got '{type_}'")

        path = d.pop("path")

        value = d.pop("value")

        previous_value = d.pop("previous_value", UNSET)

        note = d.pop("note", UNSET)

        extraction_review_event_type_0 = cls(
            version=version,
            actor_id=actor_id,
            created_at=created_at,
            type_=type_,
            path=path,
            value=value,
            previous_value=previous_value,
            note=note,
        )

        return extraction_review_event_type_0
