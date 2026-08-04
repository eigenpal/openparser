from enum import Enum

class CoordinateUnit(str, Enum):
    INCH = "inch"
    NORMALIZED = "normalized"
    PIXEL = "pixel"
    POINT = "point"

    def __str__(self) -> str:
        return str(self.value)
