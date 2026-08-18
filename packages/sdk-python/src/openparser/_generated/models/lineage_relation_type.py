from enum import Enum

class LineageRelationType(str, Enum):
    ALTERNATE_OF = "alternate_of"
    MEMBER_OF = "member_of"
    SPECIALIZATION_OF = "specialization_of"

    def __str__(self) -> str:
        return str(self.value)
