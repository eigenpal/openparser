from enum import Enum

class JobStatus(str, Enum):
    FAILED = "failed"
    INDETERMINATE = "indeterminate"
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"

    def __str__(self) -> str:
        return str(self.value)
