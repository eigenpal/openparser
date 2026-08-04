from openparser._generated.models.parsed_document import ParsedDocument
from openparser._generated.models.table_element import TableElement
from openparser._generated.models.text_element import TextElement


def test_parsed_document_elements_use_semantic_classes() -> None:
    doc = ParsedDocument.from_dict(
        {
            "output_format": "openparser@1",
            "document_id": "d1",
            "provenance": {"provider": "t", "model": "m"},
            "text": "Hi",
            "markdown": "Hi",
            "pages": [
                {
                    "number": 1,
                    "width": 10,
                    "height": 10,
                    "unit": "pixel",
                    "rotation_degrees": 0,
                    "element_ids": ["e0"],
                    "reading_order": ["e0"],
                    "languages": [],
                }
            ],
            "elements": [
                {
                    "id": "e0",
                    "kind": "text",
                    "role": "paragraph",
                    "text": "Hi",
                    "spans": [],
                    "languages": [],
                    "locations": [
                        {
                            "page_number": 1,
                            "bbox": {"left": 0, "top": 0, "right": 1, "bottom": 1},
                        }
                    ],
                },
                {
                    "id": "e1",
                    "kind": "table",
                    "row_count": 0,
                    "column_count": 0,
                    "cells": [],
                    "locations": [],
                },
            ],
            "text_annotations": [],
            "relations": [],
            "assets": [],
        }
    )
    assert isinstance(doc.elements[0], TextElement)
    assert doc.elements[0].kind == "text"
    assert isinstance(doc.elements[1], TableElement)
    assert doc.elements[1].kind == "table"
