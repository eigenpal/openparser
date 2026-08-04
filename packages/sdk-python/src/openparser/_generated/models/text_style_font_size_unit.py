from enum import Enum

class TextStyleFontSizeUnit(str, Enum):
    EM = "em"
    INCH = "inch"
    PIXEL = "pixel"
    POINT = "point"
    UNKNOWN = "unknown"

    def __str__(self) -> str:
        return str(self.value)
