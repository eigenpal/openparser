from enum import Enum

class OcrLlmModelCatalogEntryReasoningType0SupportedEffortsType0Item(str, Enum):
    HIGH = "high"
    LOW = "low"
    MAX = "max"
    MEDIUM = "medium"
    MINIMAL = "minimal"
    NONE = "none"
    XHIGH = "xhigh"

    def __str__(self) -> str:
        return str(self.value)
