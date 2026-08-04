from enum import Enum

class AssetKind(str, Enum):
    EMBEDDED_IMAGE = "embedded_image"
    FIGURE = "figure"
    OTHER = "other"
    PAGE_IMAGE = "page_image"

    def __str__(self) -> str:
        return str(self.value)
