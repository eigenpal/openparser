from enum import Enum

class FormulaFormat(str, Enum):
    LATEX = "latex"
    MATHML = "mathml"
    PLAIN = "plain"
    UNKNOWN = "unknown"

    def __str__(self) -> str:
        return str(self.value)
