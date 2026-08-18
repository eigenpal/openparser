from enum import Enum

class LineageDerivationInputEffect(str, Enum):
    DIRECT = "direct"
    INDIRECT = "indirect"

    def __str__(self) -> str:
        return str(self.value)
