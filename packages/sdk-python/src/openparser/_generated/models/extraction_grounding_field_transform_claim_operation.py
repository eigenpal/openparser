from enum import Enum

class ExtractionGroundingFieldTransformClaimOperation(str, Enum):
    BOOLEAN_ALIAS = "boolean_alias"
    CURRENCY_CODE = "currency_code"
    DATE_TIME_FORMAT = "date_time_format"
    ENUM_ALIAS = "enum_alias"
    NUMERIC_FORMAT = "numeric_format"
    QUANTITY_MAGNITUDE = "quantity_magnitude"
    TEXT_NORMALIZATION = "text_normalization"
    UNIT_CONVERSION = "unit_conversion"

    def __str__(self) -> str:
        return str(self.value)
