"""Runtime import + helper smoke for generated hosted model sugar."""

from __future__ import annotations

from openparser import (
    DEFAULT_HOSTED_OCR_MODEL_ID,
    HOSTED_OCR_MODEL_CATALOG_SUMMARY,
    HOSTED_OCR_MODEL_IDS,
    HOSTED_OCR_OPTIONS_BY_MODEL,
    hosted_parse_request,
)
from openparser.hosted_models import PaddleocrVl16Options


def test_hosted_models_export_known_ids_and_summaries() -> None:
    assert DEFAULT_HOSTED_OCR_MODEL_ID == "paddleocr-vl-1.6"
    assert "paddleocr-vl-1.6" in HOSTED_OCR_MODEL_IDS
    assert set(HOSTED_OCR_MODEL_IDS) == set(HOSTED_OCR_MODEL_CATALOG_SUMMARY)
    assert HOSTED_OCR_OPTIONS_BY_MODEL["paddleocr-vl-1.6"] is PaddleocrVl16Options
    paddle = HOSTED_OCR_MODEL_CATALOG_SUMMARY["paddleocr-vl-1.6"]
    assert paddle["capabilities"]["markdown"] is True
    assert "table" in paddle["converter"]["element_kinds"]


def test_hosted_parse_request_builds_wire_dict_and_open_model() -> None:
    known = hosted_parse_request(
        "paddleocr-vl-1.6",
        ocr_options={"image_block_ocr": True},
        output_format="openparser@1",
    )
    assert known == {
        "ocr_model": "paddleocr-vl-1.6",
        "ocr_options": {"image_block_ocr": True},
        "output_format": "openparser@1",
    }

    open_model = hosted_parse_request(
        "future-vendor-model",
        ocr_options={"experimental_flag": True},
    )
    assert open_model == {
        "ocr_model": "future-vendor-model",
        "ocr_options": {"experimental_flag": True},
    }
