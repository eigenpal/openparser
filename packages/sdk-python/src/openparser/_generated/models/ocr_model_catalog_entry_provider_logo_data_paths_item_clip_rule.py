from enum import Enum

class OcrModelCatalogEntryProviderLogoDataPathsItemClipRule(str, Enum):
    EVENODD = "evenodd"
    NONZERO = "nonzero"

    def __str__(self) -> str:
        return str(self.value)
