from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.lineage_activity_status import LineageActivityStatus
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.lineage_activity_attributes import LineageActivityAttributes
  from ..models.lineage_activity_parameters import LineageActivityParameters
  from ..models.lineage_association import LineageAssociation
  from ..models.lineage_implementation import LineageImplementation





T = TypeVar("T", bound="LineageActivity")



@_attrs_define
class LineageActivity:
    """ An operation that used entities and generated new ones, with implementation, timing, parameters, and responsible
    agents when known.

        Attributes:
            type_ (str):
            name (str | Unset):
            status (LineageActivityStatus | Unset):
            started_at (datetime.datetime | Unset):
            ended_at (datetime.datetime | Unset):
            implementation (LineageImplementation | Unset):
            parameters (LineageActivityParameters | Unset):
            associations (list[LineageAssociation] | Unset):
            attributes (LineageActivityAttributes | Unset):
     """

    type_: str
    name: str | Unset = UNSET
    status: LineageActivityStatus | Unset = UNSET
    started_at: datetime.datetime | Unset = UNSET
    ended_at: datetime.datetime | Unset = UNSET
    implementation: LineageImplementation | Unset = UNSET
    parameters: LineageActivityParameters | Unset = UNSET
    associations: list[LineageAssociation] | Unset = UNSET
    attributes: LineageActivityAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_activity_attributes import LineageActivityAttributes
        from ..models.lineage_activity_parameters import LineageActivityParameters
        from ..models.lineage_association import LineageAssociation
        from ..models.lineage_implementation import LineageImplementation
        type_ = self.type_

        name = self.name

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value


        started_at: str | Unset = UNSET
        if not isinstance(self.started_at, Unset):
            started_at = self.started_at.isoformat()

        ended_at: str | Unset = UNSET
        if not isinstance(self.ended_at, Unset):
            ended_at = self.ended_at.isoformat()

        implementation: dict[str, Any] | Unset = UNSET
        if not isinstance(self.implementation, Unset):
            implementation = self.implementation.to_dict()

        parameters: dict[str, Any] | Unset = UNSET
        if not isinstance(self.parameters, Unset):
            parameters = self.parameters.to_dict()

        associations: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.associations, Unset):
            associations = []
            for associations_item_data in self.associations:
                associations_item = associations_item_data.to_dict()
                associations.append(associations_item)



        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "type": type_,
        })
        if name is not UNSET:
            field_dict["name"] = name
        if status is not UNSET:
            field_dict["status"] = status
        if started_at is not UNSET:
            field_dict["startedAt"] = started_at
        if ended_at is not UNSET:
            field_dict["endedAt"] = ended_at
        if implementation is not UNSET:
            field_dict["implementation"] = implementation
        if parameters is not UNSET:
            field_dict["parameters"] = parameters
        if associations is not UNSET:
            field_dict["associations"] = associations
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_activity_attributes import LineageActivityAttributes
        from ..models.lineage_activity_parameters import LineageActivityParameters
        from ..models.lineage_association import LineageAssociation
        from ..models.lineage_implementation import LineageImplementation
        d = dict(src_dict)
        type_ = d.pop("type")

        name = d.pop("name", UNSET)

        _status = d.pop("status", UNSET)
        status: LineageActivityStatus | Unset
        if isinstance(_status,  Unset):
            status = UNSET
        else:
            status = LineageActivityStatus(_status)




        _started_at = d.pop("startedAt", UNSET)
        started_at: datetime.datetime | Unset
        if isinstance(_started_at,  Unset):
            started_at = UNSET
        else:
            started_at = isoparse(_started_at)




        _ended_at = d.pop("endedAt", UNSET)
        ended_at: datetime.datetime | Unset
        if isinstance(_ended_at,  Unset):
            ended_at = UNSET
        else:
            ended_at = isoparse(_ended_at)




        _implementation = d.pop("implementation", UNSET)
        implementation: LineageImplementation | Unset
        if isinstance(_implementation,  Unset):
            implementation = UNSET
        else:
            implementation = LineageImplementation.from_dict(_implementation)




        _parameters = d.pop("parameters", UNSET)
        parameters: LineageActivityParameters | Unset
        if isinstance(_parameters,  Unset):
            parameters = UNSET
        else:
            parameters = LineageActivityParameters.from_dict(_parameters)




        _associations = d.pop("associations", UNSET)
        associations: list[LineageAssociation] | Unset = UNSET
        if _associations is not UNSET:
            associations = []
            for associations_item_data in _associations:
                associations_item = LineageAssociation.from_dict(associations_item_data)



                associations.append(associations_item)


        _attributes = d.pop("attributes", UNSET)
        attributes: LineageActivityAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageActivityAttributes.from_dict(_attributes)




        lineage_activity = cls(
            type_=type_,
            name=name,
            status=status,
            started_at=started_at,
            ended_at=ended_at,
            implementation=implementation,
            parameters=parameters,
            associations=associations,
            attributes=attributes,
        )

        return lineage_activity
