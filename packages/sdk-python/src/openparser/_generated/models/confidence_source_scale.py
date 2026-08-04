from enum import Enum

class ConfidenceSourceScale(str, Enum):
    LOG_PROBABILITY = "log_probability"
    UNKNOWN = "unknown"
    ZERO_TO_HUNDRED = "zero_to_hundred"
    ZERO_TO_ONE = "zero_to_one"

    def __str__(self) -> str:
        return str(self.value)
