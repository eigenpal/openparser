from enum import Enum

class ContentKind(str, Enum):
    FIGURE = "figure"
    STATE = "state"
    TABLE = "table"
    TEXT = "text"

    def __str__(self) -> str:
        return str(self.value)
