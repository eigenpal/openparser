from enum import Enum

class PageBlockKind(str, Enum):
    FIGURE = "figure"
    TABLE = "table"
    TEXT = "text"

    def __str__(self) -> str:
        return str(self.value)
