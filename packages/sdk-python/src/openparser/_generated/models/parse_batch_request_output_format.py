from enum import Enum

class ParseBatchRequestOutputFormat(str, Enum):
    OPENPARSER1 = "openparser@1"
    RAW = "raw"

    def __str__(self) -> str:
        return str(self.value)
