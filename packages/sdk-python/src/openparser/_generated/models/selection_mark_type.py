from enum import Enum

class SelectionMarkType(str, Enum):
    CHECKBOX = "checkbox"
    OTHER = "other"
    RADIO = "radio"

    def __str__(self) -> str:
        return str(self.value)
