from enum import Enum

class TableCellRole(str, Enum):
    BODY = "body"
    COLUMN_HEADER = "column_header"
    FOOTER = "footer"
    ROW_HEADER = "row_header"
    STUB = "stub"
    TITLE = "title"

    def __str__(self) -> str:
        return str(self.value)
