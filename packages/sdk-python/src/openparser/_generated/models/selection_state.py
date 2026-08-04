from enum import Enum

class SelectionState(str, Enum):
    INDETERMINATE = "indeterminate"
    SELECTED = "selected"
    UNSELECTED = "unselected"

    def __str__(self) -> str:
        return str(self.value)
