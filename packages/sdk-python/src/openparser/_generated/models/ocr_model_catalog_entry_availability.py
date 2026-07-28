from enum import Enum

class OcrModelCatalogEntryAvailability(str, Enum):
    AVAILABLE = "available"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"

    def __str__(self) -> str:
        return str(self.value)
