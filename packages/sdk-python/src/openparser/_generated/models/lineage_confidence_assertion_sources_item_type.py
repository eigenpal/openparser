from enum import Enum

class LineageConfidenceAssertionSourcesItemType(str, Enum):
    ACTIVITY = "activity"
    AGENT = "agent"
    ENTITY = "entity"

    def __str__(self) -> str:
        return str(self.value)
