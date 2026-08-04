from enum import Enum

class TextRole(str, Enum):
    CAPTION = "caption"
    CODE = "code"
    DOCUMENT_TITLE = "document_title"
    FOOTNOTE = "footnote"
    HEADING = "heading"
    LINE = "line"
    LIST = "list"
    LIST_ITEM = "list_item"
    OTHER = "other"
    PAGE_FOOTER = "page_footer"
    PAGE_HEADER = "page_header"
    PAGE_NUMBER = "page_number"
    PARAGRAPH = "paragraph"
    SYMBOL = "symbol"
    WORD = "word"

    def __str__(self) -> str:
        return str(self.value)
