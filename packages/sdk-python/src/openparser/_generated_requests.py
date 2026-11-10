"""Bridge from the facade's plain-dict arguments to the generated request builders.

The generated `_generated.api.*` modules own the HTTP method, path, query parameter
names and multipart field layout. The facade keeps its public contract on top of them:

- callers pass plain dicts, and unknown keys are sent unchanged, so JSON bodies are
  handed to the builders as-is instead of being rebuilt from the typed models;
- optional arguments that the caller did not set are left out of the request;
- responses stay raw JSON (`AttrDict`) or bytes, so the generated `sync_detailed`
  parsers, which decode bodies into attrs models, are not used.
"""

from __future__ import annotations

from typing import Any, Optional, Sequence, Tuple

from openparser._generated.types import UNSET

MultipartPart = Tuple[str, Any]


class RawBody:
    """Carries caller-owned JSON or multipart parts to a generated request builder.

    The generated builders call `to_dict()` for JSON bodies and `to_multipart()` for
    multipart bodies; this object answers both with the facade's own values.
    """

    def __init__(
        self,
        *,
        json: Any = None,
        multipart: Optional[Sequence[MultipartPart]] = None,
    ) -> None:
        self._json = json
        self._multipart = list(multipart or [])

    def to_dict(self) -> Any:
        return self._json

    def to_multipart(self) -> list[MultipartPart]:
        return list(self._multipart)


class Wire:
    """Stands in for a generated enum. Builders read `.value` and send it unchanged.

    The server validates these strings, so the facade does not reject values that
    the generated enums do not list.
    """

    __slots__ = ("value",)

    def __init__(self, value: str) -> None:
        self.value = value


def optional(value: Any) -> Any:
    """Map an argument the caller left unset to the generator's UNSET sentinel."""
    return UNSET if value is None else value


def optional_wire(value: Optional[str]) -> Any:
    return UNSET if value is None else Wire(value)
