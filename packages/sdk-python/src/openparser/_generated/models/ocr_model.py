from enum import Enum

class OcrModel(str, Enum):
    PADDLEOCR_VL_1_6 = "paddleocr-vl-1.6"

    def __str__(self) -> str:
        return str(self.value)
