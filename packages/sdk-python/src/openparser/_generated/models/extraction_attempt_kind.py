from enum import Enum

class ExtractionAttemptKind(str, Enum):
    PRIMARY = "primary"
    REPAIR = "repair"

    def __str__(self) -> str:
        return str(self.value)
