from enum import Enum

class RegionType(str, Enum):
    BARCODE = "barcode"
    CHECKBOX = "checkbox"
    FIGURE = "figure"
    FORMULA = "formula"
    HEADER_FOOTER = "header_footer"
    HEADING = "heading"
    KEY_VALUE = "key_value"
    SIGNATURE = "signature"
    TABLE = "table"
    TEXT = "text"

    def __str__(self) -> str:
        return str(self.value)
