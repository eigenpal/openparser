from enum import Enum

class JobAcceptedOperation(str, Enum):
    EXTRACT = "extract"
    PARSE = "parse"

    def __str__(self) -> str:
        return str(self.value)
