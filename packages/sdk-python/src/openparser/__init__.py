"""Official Python SDK for the OpenParser API.

Example
-------

    from openparser import OpenParserClient

    client = OpenParserClient(api_key=os.environ["OPENPARSER_API_KEY"])

    result = client.parse.sync(
        {"ocr_model": "paddleocr-vl-1.6", "output_format": "openparser@1"},
        file=Path("invoice.pdf"),
    )

    print(result.page_count)
"""

from openparser.client import OpenParserClient
from openparser.errors import (
    OpenParserAuthError,
    OpenParserConflictError,
    OpenParserError,
    OpenParserForbiddenError,
    OpenParserGatewayTimeoutError,
    OpenParserLimitExceededError,
    OpenParserNotFoundError,
    OpenParserPaymentRequiredError,
    OpenParserRateLimitError,
    OpenParserServerError,
    OpenParserServiceUnavailableError,
    OpenParserTimeoutError,
    OpenParserUnprocessableError,
    OpenParserUnsupportedMediaError,
    OpenParserValidationError,
)

__all__ = [
    "OpenParserClient",
    "OpenParserError",
    "OpenParserAuthError",
    "OpenParserForbiddenError",
    "OpenParserNotFoundError",
    "OpenParserValidationError",
    "OpenParserPaymentRequiredError",
    "OpenParserConflictError",
    "OpenParserLimitExceededError",
    "OpenParserUnsupportedMediaError",
    "OpenParserUnprocessableError",
    "OpenParserRateLimitError",
    "OpenParserServiceUnavailableError",
    "OpenParserGatewayTimeoutError",
    "OpenParserServerError",
    "OpenParserTimeoutError",
]
