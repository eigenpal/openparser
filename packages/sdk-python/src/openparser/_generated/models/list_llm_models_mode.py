from enum import Enum

class ListLlmModelsMode(str, Enum):
    SEARCH = "search"
    SUGGESTED = "suggested"

    def __str__(self) -> str:
        return str(self.value)
