from enum import Enum

class OcrLlmModelCatalogEntryRecommendation(str, Enum):
    COMPATIBLE = "compatible"
    SUGGESTED = "suggested"

    def __str__(self) -> str:
        return str(self.value)
