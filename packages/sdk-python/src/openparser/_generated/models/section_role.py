from enum import Enum

class SectionRole(str, Enum):
    CHAPTER = "chapter"
    GROUP = "group"
    OTHER = "other"
    SECTION = "section"

    def __str__(self) -> str:
        return str(self.value)
