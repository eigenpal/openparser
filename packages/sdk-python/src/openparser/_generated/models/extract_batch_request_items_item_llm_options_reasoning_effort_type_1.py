from enum import Enum

class ExtractBatchRequestItemsItemLlmOptionsReasoningEffortType1(str, Enum):
    HIGH = "high"
    LOW = "low"
    MAX = "max"
    MEDIUM = "medium"
    MINIMAL = "minimal"
    NONE = "none"
    XHIGH = "xhigh"

    def __str__(self) -> str:
        return str(self.value)
