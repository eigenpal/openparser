from enum import Enum

class DocumentElementKind(str, Enum):
    BARCODE = "barcode"
    FIGURE = "figure"
    FORMULA = "formula"
    KEY_VALUE = "key_value"
    LINK = "link"
    OTHER = "other"
    QUERY_ANSWER = "query_answer"
    SECTION = "section"
    SELECTION_MARK = "selection_mark"
    SIGNATURE = "signature"
    STAMP = "stamp"
    TABLE = "table"
    TEXT = "text"

    def __str__(self) -> str:
        return str(self.value)
