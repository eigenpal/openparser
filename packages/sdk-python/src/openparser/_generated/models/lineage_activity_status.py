from enum import Enum

class LineageActivityStatus(str, Enum):
    CANCELLED = "cancelled"
    ENDED = "ended"
    FAILED = "failed"
    SCHEDULED = "scheduled"
    STARTED = "started"

    def __str__(self) -> str:
        return str(self.value)
