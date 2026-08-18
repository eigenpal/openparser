from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.lineage_entity_kind import LineageEntityKind
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.lineage_attribution import LineageAttribution
  from ..models.lineage_confidence_assertion import LineageConfidenceAssertion
  from ..models.lineage_digest import LineageDigest
  from ..models.lineage_entity_approvals_item import LineageEntityApprovalsItem
  from ..models.lineage_entity_attributes import LineageEntityAttributes
  from ..models.lineage_entity_schema import LineageEntitySchema
  from ..models.lineage_locator import LineageLocator
  from ..models.lineage_selector import LineageSelector





T = TypeVar("T", bound="LineageEntity")



@_attrs_define
class LineageEntity:
    """ An immutable value, artifact, evidence item, decision, or collection in a `lineage@1` derivation DAG. `path` is an
    RFC 6901 JSON Pointer.

        Attributes:
            kind (LineageEntityKind):
            name (str | Unset):
            value (Any | Unset):
            path (str | Unset):
            schema (LineageEntitySchema | Unset):
            locator (LineageLocator | Unset):
            selector (LineageSelector | Unset):
            digest (LineageDigest | Unset):
            confidence (list[LineageConfidenceAssertion] | Unset):
            approvals (list[LineageEntityApprovalsItem] | Unset):
            attributions (list[LineageAttribution] | Unset):
            attributes (LineageEntityAttributes | Unset):
     """

    kind: LineageEntityKind
    name: str | Unset = UNSET
    value: Any | Unset = UNSET
    path: str | Unset = UNSET
    schema: LineageEntitySchema | Unset = UNSET
    locator: LineageLocator | Unset = UNSET
    selector: LineageSelector | Unset = UNSET
    digest: LineageDigest | Unset = UNSET
    confidence: list[LineageConfidenceAssertion] | Unset = UNSET
    approvals: list[LineageEntityApprovalsItem] | Unset = UNSET
    attributions: list[LineageAttribution] | Unset = UNSET
    attributes: LineageEntityAttributes | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.lineage_attribution import LineageAttribution
        from ..models.lineage_confidence_assertion import LineageConfidenceAssertion
        from ..models.lineage_digest import LineageDigest
        from ..models.lineage_entity_approvals_item import LineageEntityApprovalsItem
        from ..models.lineage_entity_attributes import LineageEntityAttributes
        from ..models.lineage_entity_schema import LineageEntitySchema
        from ..models.lineage_locator import LineageLocator
        from ..models.lineage_selector import LineageSelector
        kind = self.kind.value

        name = self.name

        value = self.value

        path = self.path

        schema: dict[str, Any] | Unset = UNSET
        if not isinstance(self.schema, Unset):
            schema = self.schema.to_dict()

        locator: dict[str, Any] | Unset = UNSET
        if not isinstance(self.locator, Unset):
            locator = self.locator.to_dict()

        selector: dict[str, Any] | Unset = UNSET
        if not isinstance(self.selector, Unset):
            selector = self.selector.to_dict()

        digest: dict[str, Any] | Unset = UNSET
        if not isinstance(self.digest, Unset):
            digest = self.digest.to_dict()

        confidence: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = []
            for confidence_item_data in self.confidence:
                confidence_item = confidence_item_data.to_dict()
                confidence.append(confidence_item)



        approvals: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.approvals, Unset):
            approvals = []
            for approvals_item_data in self.approvals:
                approvals_item = approvals_item_data.to_dict()
                approvals.append(approvals_item)



        attributions: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.attributions, Unset):
            attributions = []
            for attributions_item_data in self.attributions:
                attributions_item = attributions_item_data.to_dict()
                attributions.append(attributions_item)



        attributes: dict[str, Any] | Unset = UNSET
        if not isinstance(self.attributes, Unset):
            attributes = self.attributes.to_dict()


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "kind": kind,
        })
        if name is not UNSET:
            field_dict["name"] = name
        if value is not UNSET:
            field_dict["value"] = value
        if path is not UNSET:
            field_dict["path"] = path
        if schema is not UNSET:
            field_dict["schema"] = schema
        if locator is not UNSET:
            field_dict["locator"] = locator
        if selector is not UNSET:
            field_dict["selector"] = selector
        if digest is not UNSET:
            field_dict["digest"] = digest
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if approvals is not UNSET:
            field_dict["approvals"] = approvals
        if attributions is not UNSET:
            field_dict["attributions"] = attributions
        if attributes is not UNSET:
            field_dict["attributes"] = attributes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.lineage_attribution import LineageAttribution
        from ..models.lineage_confidence_assertion import LineageConfidenceAssertion
        from ..models.lineage_digest import LineageDigest
        from ..models.lineage_entity_approvals_item import LineageEntityApprovalsItem
        from ..models.lineage_entity_attributes import LineageEntityAttributes
        from ..models.lineage_entity_schema import LineageEntitySchema
        from ..models.lineage_locator import LineageLocator
        from ..models.lineage_selector import LineageSelector
        d = dict(src_dict)
        kind = LineageEntityKind(d.pop("kind"))




        name = d.pop("name", UNSET)

        value = d.pop("value", UNSET)

        path = d.pop("path", UNSET)

        _schema = d.pop("schema", UNSET)
        schema: LineageEntitySchema | Unset
        if isinstance(_schema,  Unset):
            schema = UNSET
        else:
            schema = LineageEntitySchema.from_dict(_schema)




        _locator = d.pop("locator", UNSET)
        locator: LineageLocator | Unset
        if isinstance(_locator,  Unset):
            locator = UNSET
        else:
            locator = LineageLocator.from_dict(_locator)




        _selector = d.pop("selector", UNSET)
        selector: LineageSelector | Unset
        if isinstance(_selector,  Unset):
            selector = UNSET
        else:
            selector = LineageSelector.from_dict(_selector)




        _digest = d.pop("digest", UNSET)
        digest: LineageDigest | Unset
        if isinstance(_digest,  Unset):
            digest = UNSET
        else:
            digest = LineageDigest.from_dict(_digest)




        _confidence = d.pop("confidence", UNSET)
        confidence: list[LineageConfidenceAssertion] | Unset = UNSET
        if _confidence is not UNSET:
            confidence = []
            for confidence_item_data in _confidence:
                confidence_item = LineageConfidenceAssertion.from_dict(confidence_item_data)



                confidence.append(confidence_item)


        _approvals = d.pop("approvals", UNSET)
        approvals: list[LineageEntityApprovalsItem] | Unset = UNSET
        if _approvals is not UNSET:
            approvals = []
            for approvals_item_data in _approvals:
                approvals_item = LineageEntityApprovalsItem.from_dict(approvals_item_data)



                approvals.append(approvals_item)


        _attributions = d.pop("attributions", UNSET)
        attributions: list[LineageAttribution] | Unset = UNSET
        if _attributions is not UNSET:
            attributions = []
            for attributions_item_data in _attributions:
                attributions_item = LineageAttribution.from_dict(attributions_item_data)



                attributions.append(attributions_item)


        _attributes = d.pop("attributes", UNSET)
        attributes: LineageEntityAttributes | Unset
        if isinstance(_attributes,  Unset):
            attributes = UNSET
        else:
            attributes = LineageEntityAttributes.from_dict(_attributes)




        lineage_entity = cls(
            kind=kind,
            name=name,
            value=value,
            path=path,
            schema=schema,
            locator=locator,
            selector=selector,
            digest=digest,
            confidence=confidence,
            approvals=approvals,
            attributions=attributions,
            attributes=attributes,
        )

        return lineage_entity
