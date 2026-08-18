from enum import Enum

class LineageConfidenceAssertionKind(str, Enum):
    ASSESSED = "assessed"
    DERIVED = "derived"
    REPORTED = "reported"

    def __str__(self) -> str:
        return str(self.value)
