from enum import Enum

class BatchJobAcceptedOperation(str, Enum):
    EXTRACT_BATCH = "extract_batch"
    PARSE_BATCH = "parse_batch"

    def __str__(self) -> str:
        return str(self.value)
