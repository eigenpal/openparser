from enum import Enum

class RelationType(str, Enum):
    CAPTION_OF = "caption_of"
    CONTAINS = "contains"
    CONTINUATION_OF = "continuation_of"
    FOOTNOTE_OF = "footnote_of"
    OVERLAPS = "overlaps"
    PRECEDES = "precedes"
    REFERS_TO = "refers_to"

    def __str__(self) -> str:
        return str(self.value)
