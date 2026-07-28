from enum import Enum

class ExtractionGroundingMode(str, Enum):
    FIELD = "field"
    NONE = "none"

    def __str__(self) -> str:
        return str(self.value)
