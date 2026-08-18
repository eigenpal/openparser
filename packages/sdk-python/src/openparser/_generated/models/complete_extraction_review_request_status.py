from enum import Enum

class CompleteExtractionReviewRequestStatus(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"

    def __str__(self) -> str:
        return str(self.value)
