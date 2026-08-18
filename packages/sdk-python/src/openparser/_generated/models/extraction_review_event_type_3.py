from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from dateutil.parser import isoparse
from typing import cast
from typing import Literal, cast
import datetime






T = TypeVar("T", bound="ExtractionReviewEventType3")



@_attrs_define
class ExtractionReviewEventType3:
    """
        Attributes:
            version (int):
            actor_id (str):
            created_at (datetime.datetime):
            type_ (Literal['completion_retracted']):
     """

    version: int
    actor_id: str
    created_at: datetime.datetime
    type_: Literal['completion_retracted']





    def to_dict(self) -> dict[str, Any]:
        version = self.version

        actor_id = self.actor_id

        created_at = self.created_at.isoformat()

        type_ = self.type_


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "version": version,
            "actor_id": actor_id,
            "created_at": created_at,
            "type": type_,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        version = d.pop("version")

        actor_id = d.pop("actor_id")

        created_at = isoparse(d.pop("created_at"))




        type_ = cast(Literal['completion_retracted'] , d.pop("type"))
        if type_ != 'completion_retracted':
            raise ValueError(f"type must match const 'completion_retracted', got '{type_}'")

        extraction_review_event_type_3 = cls(
            version=version,
            actor_id=actor_id,
            created_at=created_at,
            type_=type_,
        )

        return extraction_review_event_type_3
