from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast
from typing import Literal, cast






T = TypeVar("T", bound="OcrModelCatalogEntryPricingConfigurationsItemOptions")



@_attrs_define
class OcrModelCatalogEntryPricingConfigurationsItemOptions:
    """
     """

    additional_properties: dict[str, bool | Literal['set'] | Literal['unset']] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:

        field_dict: dict[str, Any] = {}
        for prop_name, prop in self.additional_properties.items():

            field_dict[prop_name] = prop


        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        ocr_model_catalog_entry_pricing_configurations_item_options = cls(
        )


        additional_properties = {}
        for prop_name, prop_dict in d.items():
            def _parse_additional_property(data: object) -> bool | Literal['set'] | Literal['unset']:
                additional_property_type_1 = cast(Literal['set'] , data)
                if additional_property_type_1 != 'set':
                    raise ValueError(f"AdditionalProperty_type_1 must match const 'set', got '{additional_property_type_1}'")
                return additional_property_type_1
                additional_property_type_2 = cast(Literal['unset'] , data)
                if additional_property_type_2 != 'unset':
                    raise ValueError(f"AdditionalProperty_type_2 must match const 'unset', got '{additional_property_type_2}'")
                return additional_property_type_2
                return cast(bool | Literal['set'] | Literal['unset'], data)

            additional_property = _parse_additional_property(prop_dict)

            additional_properties[prop_name] = additional_property

        ocr_model_catalog_entry_pricing_configurations_item_options.additional_properties = additional_properties
        return ocr_model_catalog_entry_pricing_configurations_item_options

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> bool | Literal['set'] | Literal['unset']:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: bool | Literal['set'] | Literal['unset']) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
