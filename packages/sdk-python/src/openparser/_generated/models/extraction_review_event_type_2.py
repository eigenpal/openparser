from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.extraction_review_event_type_2_type import ExtractionReviewEventType2Type
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime






T = TypeVar("T", bound="ExtractionReviewEventType2")



@_attrs_define
class ExtractionReviewEventType2:
    """
        Attributes:
            version (int):
            actor_id (str):
            created_at (datetime.datetime):
            type_ (ExtractionReviewEventType2Type):
            note (str | Unset):
     """

    version: int
    actor_id: str
    created_at: datetime.datetime
    type_: ExtractionReviewEventType2Type
    note: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        version = self.version

        actor_id = self.actor_id

        created_at = self.created_at.isoformat()

        type_ = self.type_.value

        note = self.note


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "version": version,
            "actor_id": actor_id,
            "created_at": created_at,
            "type": type_,
        })
        if note is not UNSET:
            field_dict["note"] = note

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        version = d.pop("version")

        actor_id = d.pop("actor_id")

        created_at = isoparse(d.pop("created_at"))




        type_ = ExtractionReviewEventType2Type(d.pop("type"))




        note = d.pop("note", UNSET)

        extraction_review_event_type_2 = cls(
            version=version,
            actor_id=actor_id,
            created_at=created_at,
            type_=type_,
            note=note,
        )

        return extraction_review_event_type_2
