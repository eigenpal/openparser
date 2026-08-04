from enum import Enum

class ExtractionCitationGranularity(str, Enum):
    ELEMENT = "element"
    TABLE_CELL = "table_cell"
    TEXT_SPAN = "text_span"

    def __str__(self) -> str:
        return str(self.value)
