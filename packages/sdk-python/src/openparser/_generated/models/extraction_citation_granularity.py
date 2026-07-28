from enum import Enum

class ExtractionCitationGranularity(str, Enum):
    BLOCK = "block"
    REGION = "region"

    def __str__(self) -> str:
        return str(self.value)
