from enum import Enum

class LineageEntityKind(str, Enum):
    ARTIFACT = "artifact"
    COLLECTION = "collection"
    DECISION = "decision"
    EVIDENCE = "evidence"
    VALUE = "value"

    def __str__(self) -> str:
        return str(self.value)
