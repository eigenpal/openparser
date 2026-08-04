from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast
from typing import Literal, cast

if TYPE_CHECKING:
  from ..models.barcode_element import BarcodeElement
  from ..models.document_asset import DocumentAsset
  from ..models.document_page import DocumentPage
  from ..models.document_provenance import DocumentProvenance
  from ..models.document_relation import DocumentRelation
  from ..models.figure_element import FigureElement
  from ..models.formula_element import FormulaElement
  from ..models.key_value_element import KeyValueElement
  from ..models.link_element import LinkElement
  from ..models.other_element import OtherElement
  from ..models.query_answer_element import QueryAnswerElement
  from ..models.section_element import SectionElement
  from ..models.selection_mark_element import SelectionMarkElement
  from ..models.signature_element import SignatureElement
  from ..models.stamp_element import StampElement
  from ..models.table_element import TableElement
  from ..models.text_annotation import TextAnnotation
  from ..models.text_element import TextElement





T = TypeVar("T", bound="ParsedDocument")



@_attrs_define
class ParsedDocument:
    """ Versioned OpenParser `openparser@1` document graph. `pages` establish coordinate spaces;
    `elements` carry semantic payloads and geometry; `relations` preserve hierarchy and
    cross-element meaning; `assets` hold reusable binary references (for example figure URIs).
    Compatible optional fields may be added within version 1; breaking representation changes
    create a new output-format version.

        Attributes:
            output_format (Literal['openparser@1']):
            document_id (str):
            provenance (DocumentProvenance):
            text (str):
            markdown (str): Canonical best-effort Markdown rendering derived from the document graph.
            pages (list[DocumentPage]): One-based contiguous page coordinate spaces with element membership and reading
                order.
            elements (list[BarcodeElement | FigureElement | FormulaElement | KeyValueElement | LinkElement | OtherElement |
                QueryAnswerElement | SectionElement | SelectionMarkElement | SignatureElement | StampElement | TableElement |
                TextElement]): Ordered semantic nodes referenced by page membership, relations, and grounding citations.
            text_annotations (list[TextAnnotation]):
            relations (list[DocumentRelation]):
            assets (list[DocumentAsset]):
     """

    output_format: Literal['openparser@1']
    document_id: str
    provenance: DocumentProvenance
    text: str
    markdown: str
    pages: list[DocumentPage]
    elements: list[BarcodeElement | FigureElement | FormulaElement | KeyValueElement | LinkElement | OtherElement | QueryAnswerElement | SectionElement | SelectionMarkElement | SignatureElement | StampElement | TableElement | TextElement]
    text_annotations: list[TextAnnotation]
    relations: list[DocumentRelation]
    assets: list[DocumentAsset]





    def to_dict(self) -> dict[str, Any]:
        from ..models.barcode_element import BarcodeElement
        from ..models.document_asset import DocumentAsset
        from ..models.document_page import DocumentPage
        from ..models.document_provenance import DocumentProvenance
        from ..models.document_relation import DocumentRelation
        from ..models.figure_element import FigureElement
        from ..models.formula_element import FormulaElement
        from ..models.key_value_element import KeyValueElement
        from ..models.link_element import LinkElement
        from ..models.other_element import OtherElement
        from ..models.query_answer_element import QueryAnswerElement
        from ..models.section_element import SectionElement
        from ..models.selection_mark_element import SelectionMarkElement
        from ..models.signature_element import SignatureElement
        from ..models.stamp_element import StampElement
        from ..models.table_element import TableElement
        from ..models.text_annotation import TextAnnotation
        from ..models.text_element import TextElement
        output_format = self.output_format

        document_id = self.document_id

        provenance = self.provenance.to_dict()

        text = self.text

        markdown = self.markdown

        pages = []
        for pages_item_data in self.pages:
            pages_item = pages_item_data.to_dict()
            pages.append(pages_item)



        elements = []
        for elements_item_data in self.elements:
            elements_item: dict[str, Any]
            if isinstance(elements_item_data, TextElement):
                elements_item = elements_item_data.to_dict()
            elif isinstance(elements_item_data, TableElement):
                elements_item = elements_item_data.to_dict()
            elif isinstance(elements_item_data, FigureElement):
                elements_item = elements_item_data.to_dict()
            elif isinstance(elements_item_data, FormulaElement):
                elements_item = elements_item_data.to_dict()
            elif isinstance(elements_item_data, KeyValueElement):
                elements_item = elements_item_data.to_dict()
            elif isinstance(elements_item_data, QueryAnswerElement):
                elements_item = elements_item_data.to_dict()
            elif isinstance(elements_item_data, SectionElement):
                elements_item = elements_item_data.to_dict()
            elif isinstance(elements_item_data, SelectionMarkElement):
                elements_item = elements_item_data.to_dict()
            elif isinstance(elements_item_data, SignatureElement):
                elements_item = elements_item_data.to_dict()
            elif isinstance(elements_item_data, BarcodeElement):
                elements_item = elements_item_data.to_dict()
            elif isinstance(elements_item_data, LinkElement):
                elements_item = elements_item_data.to_dict()
            elif isinstance(elements_item_data, StampElement):
                elements_item = elements_item_data.to_dict()
            else:
                elements_item = elements_item_data.to_dict()

            elements.append(elements_item)



        text_annotations = []
        for text_annotations_item_data in self.text_annotations:
            text_annotations_item = text_annotations_item_data.to_dict()
            text_annotations.append(text_annotations_item)



        relations = []
        for relations_item_data in self.relations:
            relations_item = relations_item_data.to_dict()
            relations.append(relations_item)



        assets = []
        for assets_item_data in self.assets:
            assets_item = assets_item_data.to_dict()
            assets.append(assets_item)




        field_dict: dict[str, Any] = {}

        field_dict.update({
            "output_format": output_format,
            "document_id": document_id,
            "provenance": provenance,
            "text": text,
            "markdown": markdown,
            "pages": pages,
            "elements": elements,
            "text_annotations": text_annotations,
            "relations": relations,
            "assets": assets,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.barcode_element import BarcodeElement
        from ..models.document_asset import DocumentAsset
        from ..models.document_page import DocumentPage
        from ..models.document_provenance import DocumentProvenance
        from ..models.document_relation import DocumentRelation
        from ..models.figure_element import FigureElement
        from ..models.formula_element import FormulaElement
        from ..models.key_value_element import KeyValueElement
        from ..models.link_element import LinkElement
        from ..models.other_element import OtherElement
        from ..models.query_answer_element import QueryAnswerElement
        from ..models.section_element import SectionElement
        from ..models.selection_mark_element import SelectionMarkElement
        from ..models.signature_element import SignatureElement
        from ..models.stamp_element import StampElement
        from ..models.table_element import TableElement
        from ..models.text_annotation import TextAnnotation
        from ..models.text_element import TextElement
        d = dict(src_dict)
        output_format = cast(Literal['openparser@1'] , d.pop("output_format"))
        if output_format != 'openparser@1':
            raise ValueError(f"output_format must match const 'openparser@1', got '{output_format}'")

        document_id = d.pop("document_id")

        provenance = DocumentProvenance.from_dict(d.pop("provenance"))




        text = d.pop("text")

        markdown = d.pop("markdown")

        pages = []
        _pages = d.pop("pages")
        for pages_item_data in (_pages):
            pages_item = DocumentPage.from_dict(pages_item_data)



            pages.append(pages_item)


        elements = []
        _elements = d.pop("elements")
        for elements_item_data in (_elements):
            def _parse_elements_item(data: object) -> BarcodeElement | FigureElement | FormulaElement | KeyValueElement | LinkElement | OtherElement | QueryAnswerElement | SectionElement | SelectionMarkElement | SignatureElement | StampElement | TableElement | TextElement:
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_document_element_type_0 = TextElement.from_dict(data)



                    return componentsschemas_document_element_type_0
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_document_element_type_1 = TableElement.from_dict(data)



                    return componentsschemas_document_element_type_1
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_document_element_type_2 = FigureElement.from_dict(data)



                    return componentsschemas_document_element_type_2
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_document_element_type_3 = FormulaElement.from_dict(data)



                    return componentsschemas_document_element_type_3
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_document_element_type_4 = KeyValueElement.from_dict(data)



                    return componentsschemas_document_element_type_4
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_document_element_type_5 = QueryAnswerElement.from_dict(data)



                    return componentsschemas_document_element_type_5
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_document_element_type_6 = SectionElement.from_dict(data)



                    return componentsschemas_document_element_type_6
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_document_element_type_7 = SelectionMarkElement.from_dict(data)



                    return componentsschemas_document_element_type_7
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_document_element_type_8 = SignatureElement.from_dict(data)



                    return componentsschemas_document_element_type_8
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_document_element_type_9 = BarcodeElement.from_dict(data)



                    return componentsschemas_document_element_type_9
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_document_element_type_10 = LinkElement.from_dict(data)



                    return componentsschemas_document_element_type_10
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    componentsschemas_document_element_type_11 = StampElement.from_dict(data)



                    return componentsschemas_document_element_type_11
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_document_element_type_12 = OtherElement.from_dict(data)



                return componentsschemas_document_element_type_12

            elements_item = _parse_elements_item(elements_item_data)

            elements.append(elements_item)


        text_annotations = []
        _text_annotations = d.pop("text_annotations")
        for text_annotations_item_data in (_text_annotations):
            text_annotations_item = TextAnnotation.from_dict(text_annotations_item_data)



            text_annotations.append(text_annotations_item)


        relations = []
        _relations = d.pop("relations")
        for relations_item_data in (_relations):
            relations_item = DocumentRelation.from_dict(relations_item_data)



            relations.append(relations_item)


        assets = []
        _assets = d.pop("assets")
        for assets_item_data in (_assets):
            assets_item = DocumentAsset.from_dict(assets_item_data)



            assets.append(assets_item)


        parsed_document = cls(
            output_format=output_format,
            document_id=document_id,
            provenance=provenance,
            text=text,
            markdown=markdown,
            pages=pages,
            elements=elements,
            text_annotations=text_annotations,
            relations=relations,
            assets=assets,
        )

        return parsed_document
