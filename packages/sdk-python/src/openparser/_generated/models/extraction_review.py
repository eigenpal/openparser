from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.extraction_review_status import ExtractionReviewStatus
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.extraction_review_event_type_0 import ExtractionReviewEventType0
  from ..models.extraction_review_event_type_1 import ExtractionReviewEventType1
  from ..models.extraction_review_event_type_2 import ExtractionReviewEventType2
  from ..models.extraction_review_event_type_3 import ExtractionReviewEventType3
  from ..models.lineage_document import LineageDocument





T = TypeVar("T", bound="ExtractionReview")



@_attrs_define
class ExtractionReview:
    """ Versioned review state that preserves immutable machine output beside corrected output and append-only attributed
    events. Grounded reviews also extend the machine `lineage@1` graph with confirm and completion activities.
    Retracting a tip removes that confirmation from the projected graph while the event log keeps the retraction.

        Attributes:
            job_id (str): Prefixed public id for an OCR job (`opj_…`). Example: opj_V1StGXR8_Z5jdHi6B-myT.
            status (ExtractionReviewStatus):
            machine_output (Any):
            corrected_output (Any):
            version (int):
            events (list[ExtractionReviewEventType0 | ExtractionReviewEventType1 | ExtractionReviewEventType2 |
                ExtractionReviewEventType3]):
            created_at (datetime.datetime | None):
            updated_at (datetime.datetime | None):
            completed_at (datetime.datetime | None):
            reviewed_by_actor_id (None | str):
            viewer_actor_id (str):
            lineage (LineageDocument | Unset): A complete, acyclic `lineage@1` data-derivation graph grounded in W3C PROV
                semantics. Downstream systems can append entities, activities, agents, and derivations.
     """

    job_id: str
    status: ExtractionReviewStatus
    machine_output: Any
    corrected_output: Any
    version: int
    events: list[ExtractionReviewEventType0 | ExtractionReviewEventType1 | ExtractionReviewEventType2 | ExtractionReviewEventType3]
    created_at: datetime.datetime | None
    updated_at: datetime.datetime | None
    completed_at: datetime.datetime | None
    reviewed_by_actor_id: None | str
    viewer_actor_id: str
    lineage: LineageDocument | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.extraction_review_event_type_0 import ExtractionReviewEventType0
        from ..models.extraction_review_event_type_1 import ExtractionReviewEventType1
        from ..models.extraction_review_event_type_2 import ExtractionReviewEventType2
        from ..models.extraction_review_event_type_3 import ExtractionReviewEventType3
        from ..models.lineage_document import LineageDocument
        job_id = self.job_id

        status = self.status.value

        machine_output = self.machine_output

        corrected_output = self.corrected_output

        version = self.version

        events = []
        for events_item_data in self.events:
            events_item: dict[str, Any]
            if isinstance(events_item_data, ExtractionReviewEventType0):
                events_item = events_item_data.to_dict()
            elif isinstance(events_item_data, ExtractionReviewEventType1):
                events_item = events_item_data.to_dict()
            elif isinstance(events_item_data, ExtractionReviewEventType2):
                events_item = events_item_data.to_dict()
            else:
                events_item = events_item_data.to_dict()

            events.append(events_item)



        created_at: None | str
        if isinstance(self.created_at, datetime.datetime):
            created_at = self.created_at.isoformat()
        else:
            created_at = self.created_at

        updated_at: None | str
        if isinstance(self.updated_at, datetime.datetime):
            updated_at = self.updated_at.isoformat()
        else:
            updated_at = self.updated_at

        completed_at: None | str
        if isinstance(self.completed_at, datetime.datetime):
            completed_at = self.completed_at.isoformat()
        else:
            completed_at = self.completed_at

        reviewed_by_actor_id: None | str
        reviewed_by_actor_id = self.reviewed_by_actor_id

        viewer_actor_id = self.viewer_actor_id

        lineage: dict[str, Any] | Unset = UNSET
        if not isinstance(self.lineage, Unset):
            lineage = self.lineage.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "job_id": job_id,
            "status": status,
            "machine_output": machine_output,
            "corrected_output": corrected_output,
            "version": version,
            "events": events,
            "created_at": created_at,
            "updated_at": updated_at,
            "completed_at": completed_at,
            "reviewed_by_actor_id": reviewed_by_actor_id,
            "viewer_actor_id": viewer_actor_id,
        })
        if lineage is not UNSET:
            field_dict["lineage"] = lineage

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.extraction_review_event_type_0 import ExtractionReviewEventType0
        from ..models.extraction_review_event_type_1 import ExtractionReviewEventType1
        from ..models.extraction_review_event_type_2 import ExtractionReviewEventType2
        from ..models.extraction_review_event_type_3 import ExtractionReviewEventType3
        from ..models.lineage_document import LineageDocument
        d = dict(src_dict)
        job_id = d.pop("job_id")

        status = ExtractionReviewStatus(d.pop("status"))




        machine_output = d.pop("machine_output")

        corrected_output = d.pop("corrected_output")

        version = d.pop("version")

        events = []
        _events = d.pop("events")
        for events_item_data in (_events):
            def _parse_events_item(data: object) -> ExtractionReviewEventType0 | ExtractionReviewEventType1 | ExtractionReviewEventType2 | ExtractionReviewEventType3:
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_extraction_review_event_type_0 = ExtractionReviewEventType0.from_dict(data)



                    return componentsschemas_extraction_review_event_type_0
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_extraction_review_event_type_1 = ExtractionReviewEventType1.from_dict(data)



                    return componentsschemas_extraction_review_event_type_1
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_extraction_review_event_type_2 = ExtractionReviewEventType2.from_dict(data)



                    return componentsschemas_extraction_review_event_type_2
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_extraction_review_event_type_3 = ExtractionReviewEventType3.from_dict(data)



                return componentsschemas_extraction_review_event_type_3

            events_item = _parse_events_item(events_item_data)

            events.append(events_item)


        def _parse_created_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                created_at_type_0 = isoparse(data)



                return created_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        created_at = _parse_created_at(d.pop("created_at"))


        def _parse_updated_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                updated_at_type_0 = isoparse(data)



                return updated_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        updated_at = _parse_updated_at(d.pop("updated_at"))


        def _parse_completed_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                completed_at_type_0 = isoparse(data)



                return completed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        completed_at = _parse_completed_at(d.pop("completed_at"))


        def _parse_reviewed_by_actor_id(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        reviewed_by_actor_id = _parse_reviewed_by_actor_id(d.pop("reviewed_by_actor_id"))


        viewer_actor_id = d.pop("viewer_actor_id")

        _lineage = d.pop("lineage", UNSET)
        lineage: LineageDocument | Unset
        if isinstance(_lineage,  Unset):
            lineage = UNSET
        else:
            lineage = LineageDocument.from_dict(_lineage)




        extraction_review = cls(
            job_id=job_id,
            status=status,
            machine_output=machine_output,
            corrected_output=corrected_output,
            version=version,
            events=events,
            created_at=created_at,
            updated_at=updated_at,
            completed_at=completed_at,
            reviewed_by_actor_id=reviewed_by_actor_id,
            viewer_actor_id=viewer_actor_id,
            lineage=lineage,
        )

        return extraction_review
