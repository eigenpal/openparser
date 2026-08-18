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






T = TypeVar("T", bound="ExtractionReviewEventType1")



@_attrs_define
class ExtractionReviewEventType1:
    """
        Attributes:
            version (int):
            actor_id (str):
            created_at (datetime.datetime):
            type_ (Literal['field_confirmation_retracted']):
            path (str):
     """

    version: int
    actor_id: str
    created_at: datetime.datetime
    type_: Literal['field_confirmation_retracted']
    path: str





    def to_dict(self) -> dict[str, Any]:
        version = self.version

        actor_id = self.actor_id

        created_at = self.created_at.isoformat()

        type_ = self.type_

        path = self.path


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "version": version,
            "actor_id": actor_id,
            "created_at": created_at,
            "type": type_,
            "path": path,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        version = d.pop("version")

        actor_id = d.pop("actor_id")

        created_at = isoparse(d.pop("created_at"))




        type_ = cast(Literal['field_confirmation_retracted'] , d.pop("type"))
        if type_ != 'field_confirmation_retracted':
            raise ValueError(f"type must match const 'field_confirmation_retracted', got '{type_}'")

        path = d.pop("path")

        extraction_review_event_type_1 = cls(
            version=version,
            actor_id=actor_id,
            created_at=created_at,
            type_=type_,
            path=path,
        )

        return extraction_review_event_type_1
