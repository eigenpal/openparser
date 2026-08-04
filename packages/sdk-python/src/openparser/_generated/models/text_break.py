from enum import Enum

class TextBreak(str, Enum):
    HYPHEN = "hyphen"
    LINE_BREAK = "line_break"
    NONE = "none"
    SPACE = "space"
    WIDE_SPACE = "wide_space"

    def __str__(self) -> str:
        return str(self.value)
