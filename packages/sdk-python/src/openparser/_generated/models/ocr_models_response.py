from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
  from ..models.ocr_model_catalog_entry import OcrModelCatalogEntry





T = TypeVar("T", bound="OcrModelsResponse")



@_attrs_define
class OcrModelsResponse:
    """ OCR model discovery response for `GET /models/ocr`.

        Attributes:
            data (list[OcrModelCatalogEntry]):
     """

    data: list[OcrModelCatalogEntry]





    def to_dict(self) -> dict[str, Any]:
        from ..models.ocr_model_catalog_entry import OcrModelCatalogEntry
        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)




        field_dict: dict[str, Any] = {}

        field_dict.update({
            "data": data,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ocr_model_catalog_entry import OcrModelCatalogEntry
        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in (_data):
            data_item = OcrModelCatalogEntry.from_dict(data_item_data)



            data.append(data_item)


        ocr_models_response = cls(
            data=data,
        )

        return ocr_models_response
