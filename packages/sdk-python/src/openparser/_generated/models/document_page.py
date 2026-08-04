from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.coordinate_unit import CoordinateUnit
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.confidence import Confidence
  from ..models.document_page_quality import DocumentPageQuality
  from ..models.language import Language





T = TypeVar("T", bound="DocumentPage")



@_attrs_define
class DocumentPage:
    """
        Attributes:
            number (int):
            width (float):
            height (float):
            unit (CoordinateUnit):
            rotation_degrees (float):  Default: 0.0.
            languages (list[Language]):
            element_ids (list[str]):
            reading_order (list[str]):
            source_page_number (int | Unset):
            confidence (Confidence | Unset):
            quality (DocumentPageQuality | Unset):
            image_asset_id (str | Unset):
     """

    number: int
    width: float
    height: float
    unit: CoordinateUnit
    languages: list[Language]
    element_ids: list[str]
    reading_order: list[str]
    rotation_degrees: float = 0.0
    source_page_number: int | Unset = UNSET
    confidence: Confidence | Unset = UNSET
    quality: DocumentPageQuality | Unset = UNSET
    image_asset_id: str | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.confidence import Confidence
        from ..models.document_page_quality import DocumentPageQuality
        from ..models.language import Language
        number = self.number

        width = self.width

        height = self.height

        unit = self.unit.value

        rotation_degrees = self.rotation_degrees

        languages = []
        for languages_item_data in self.languages:
            languages_item = languages_item_data.to_dict()
            languages.append(languages_item)



        element_ids = self.element_ids



        reading_order = self.reading_order



        source_page_number = self.source_page_number

        confidence: dict[str, Any] | Unset = UNSET
        if not isinstance(self.confidence, Unset):
            confidence = self.confidence.to_dict()

        quality: dict[str, Any] | Unset = UNSET
        if not isinstance(self.quality, Unset):
            quality = self.quality.to_dict()

        image_asset_id = self.image_asset_id


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "number": number,
            "width": width,
            "height": height,
            "unit": unit,
            "rotation_degrees": rotation_degrees,
            "languages": languages,
            "element_ids": element_ids,
            "reading_order": reading_order,
        })
        if source_page_number is not UNSET:
            field_dict["source_page_number"] = source_page_number
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if quality is not UNSET:
            field_dict["quality"] = quality
        if image_asset_id is not UNSET:
            field_dict["image_asset_id"] = image_asset_id

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.confidence import Confidence
        from ..models.document_page_quality import DocumentPageQuality
        from ..models.language import Language
        d = dict(src_dict)
        number = d.pop("number")

        width = d.pop("width")

        height = d.pop("height")

        unit = CoordinateUnit(d.pop("unit"))




        rotation_degrees = d.pop("rotation_degrees")

        languages = []
        _languages = d.pop("languages")
        for languages_item_data in (_languages):
            languages_item = Language.from_dict(languages_item_data)



            languages.append(languages_item)


        element_ids = cast(list[str], d.pop("element_ids"))


        reading_order = cast(list[str], d.pop("reading_order"))


        source_page_number = d.pop("source_page_number", UNSET)

        _confidence = d.pop("confidence", UNSET)
        confidence: Confidence | Unset
        if isinstance(_confidence,  Unset):
            confidence = UNSET
        else:
            confidence = Confidence.from_dict(_confidence)




        _quality = d.pop("quality", UNSET)
        quality: DocumentPageQuality | Unset
        if isinstance(_quality,  Unset):
            quality = UNSET
        else:
            quality = DocumentPageQuality.from_dict(_quality)




        image_asset_id = d.pop("image_asset_id", UNSET)

        document_page = cls(
            number=number,
            width=width,
            height=height,
            unit=unit,
            rotation_degrees=rotation_degrees,
            languages=languages,
            element_ids=element_ids,
            reading_order=reading_order,
            source_page_number=source_page_number,
            confidence=confidence,
            quality=quality,
            image_asset_id=image_asset_id,
        )

        return document_page
