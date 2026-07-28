from enum import Enum

class JobOperation(str, Enum):
    EXTRACT = "extract"
    EXTRACT_BATCH = "extract_batch"
    PARSE = "parse"
    PARSE_BATCH = "parse_batch"

    def __str__(self) -> str:
        return str(self.value)
