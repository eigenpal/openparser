from enum import Enum

class OcrModelCatalogEntryOptionControlsItemKind(str, Enum):
    BOOLEAN = "boolean"
    ENUM = "enum"
    NULLABLE_ENUM = "nullable-enum"
    NULLABLE_STRING = "nullable-string"
    NULLABLE_STRING_LIST = "nullable-string-list"

    def __str__(self) -> str:
        return str(self.value)
