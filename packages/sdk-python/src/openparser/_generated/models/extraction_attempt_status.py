from enum import Enum

class ExtractionAttemptStatus(str, Enum):
    FAILED = "failed"
    INDETERMINATE = "indeterminate"
    SUCCEEDED = "succeeded"

    def __str__(self) -> str:
        return str(self.value)
