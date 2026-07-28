from enum import Enum

class UpdateExtractionPipelineRequestGrounding(str, Enum):
    FIELD = "field"
    NONE = "none"

    def __str__(self) -> str:
        return str(self.value)
