from enum import Enum

class ConfidenceScope(str, Enum):
    ANSWER = "answer"
    CLASSIFICATION = "classification"
    DETECTION = "detection"
    GEOMETRY = "geometry"
    QUALITY = "quality"
    RECOGNITION = "recognition"

    def __str__(self) -> str:
        return str(self.value)
