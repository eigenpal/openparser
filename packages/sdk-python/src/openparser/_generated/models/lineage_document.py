from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from typing import Literal, cast

if TYPE_CHECKING:
  from ..models.lineage_derivation import LineageDerivation
  from ..models.lineage_document_activities import LineageDocumentActivities
  from ..models.lineage_document_agents import LineageDocumentAgents
  from ..models.lineage_document_attributes import LineageDocumentAttributes
  from ..models.lineage_document_entities import LineageDocumentEntities
  from ..models.lineage_relation import LineageRelation





T = TypeVar("T", bound="LineageDocument")



@_attrs_define
class LineageDocument:
    """ A complete, acyclic `lineage@1` data-derivation graph grounded in W3C PROV semantics. Downstream systems can append
    entities, activities, agents, and derivations.

        Attributes:
            format_ (Literal['lineage@1']):
            entities (LineageDocumentEntities):
            activities (LineageDocumentActivities):
            agents (LineageDocumentAgents):
            derivations (list[LineageDerivation]):
            relations (list[LineageRelation]):
            outputs (list[str]):
            id (str | Unset):
            profiles (list[str] | Unset):
            attributes (LineageDocumentAttributes | Unset):
     """

    format_: Literal['lineage@1']
    entities: LineageDocumentEntities
    activities: LineageDocumentActivities
    agents: LineageDocumentAgents
    derivations: list[LineageDerivation]
    relations: list[LineageRelation]
    outputs: list[str]
    id: str | Unset = UNSET
    profiles: list[str] | Unset = UNSET
    attributes: LineageDocumentAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_derivation import LineageDerivation
        from ..models.lineage_document_activities import LineageDocumentActivities
        from ..models.lineage_document_agents import LineageDocumentAgents
        from ..models.lineage_document_attributes import LineageDocumentAttributes
        from ..models.lineage_document_entities import LineageDocumentEntities
        from ..models.lineage_relation import LineageRelation
        format_ = self.format_

        entities = self.entities.to_dict()

        activities = self.activities.to_dict()

        agents = self.agents.to_dict()

        derivations = []
        for derivations_item_data in self.derivations:
            derivations_item = derivations_item_data.to_dict()
            derivations.append(derivations_item)



        relations = []
        for relations_item_data in self.relations:
            relations_item = relations_item_data.to_dict()
            relations.append(relations_item)



        outputs = self.outputs



        id = self.id

        profiles: list[str] | Unset = UNSET
        if not isinstance(self.profiles, Unset):
            profiles = self.profiles



        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "format": format_,
            "entities": entities,
            "activities": activities,
            "agents": agents,
            "derivations": derivations,
            "relations": relations,
            "outputs": outputs,
        })
        if id is not UNSET:
            field_dict["id"] = id
        if profiles is not UNSET:
            field_dict["profiles"] = profiles
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_derivation import LineageDerivation
        from ..models.lineage_document_activities import LineageDocumentActivities
        from ..models.lineage_document_agents import LineageDocumentAgents
        from ..models.lineage_document_attributes import LineageDocumentAttributes
        from ..models.lineage_document_entities import LineageDocumentEntities
        from ..models.lineage_relation import LineageRelation
        d = dict(src_dict)
        format_ = cast(Literal['lineage@1'] , d.pop("format"))
        if format_ != 'lineage@1':
            raise ValueError(f"format must match const 'lineage@1', got '{format_}'")

        entities = LineageDocumentEntities.from_dict(d.pop("entities"))




        activities = LineageDocumentActivities.from_dict(d.pop("activities"))




        agents = LineageDocumentAgents.from_dict(d.pop("agents"))




        derivations = []
        _derivations = d.pop("derivations")
        for derivations_item_data in (_derivations):
            derivations_item = LineageDerivation.from_dict(derivations_item_data)



            derivations.append(derivations_item)


        relations = []
        _relations = d.pop("relations")
        for relations_item_data in (_relations):
            relations_item = LineageRelation.from_dict(relations_item_data)



            relations.append(relations_item)


        outputs = cast(list[str], d.pop("outputs"))


        id = d.pop("id", UNSET)

        profiles = cast(list[str], d.pop("profiles", UNSET))


        _attributes = d.pop("attributes", UNSET)
        attributes: LineageDocumentAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageDocumentAttributes.from_dict(_attributes)




        lineage_document = cls(
            format_=format_,
            entities=entities,
            activities=activities,
            agents=agents,
            derivations=derivations,
            relations=relations,
            outputs=outputs,
            id=id,
            profiles=profiles,
            attributes=attributes,
        )

        return lineage_document
