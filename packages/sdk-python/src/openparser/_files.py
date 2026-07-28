"""File upload helpers for parse, extract, and file pool requests."""

from __future__ import annotations

import mimetypes
from pathlib import Path
from typing import IO, Any, Optional, Tuple


def is_file_input(value: Any) -> bool:
    if isinstance(value, Path):
        return True
    if isinstance(value, dict):
        content = value.get("content")
        filename = value.get("filename")
        return isinstance(filename, str) and isinstance(content, (bytes, bytearray))
    if hasattr(value, "read") and hasattr(value, "name"):
        return True
    return False


def to_upload_tuple(value: Any) -> Tuple[str, bytes, str]:
    if isinstance(value, Path):
        content = value.read_bytes()
        filename = value.name
        mime_type, _ = mimetypes.guess_type(filename)
        return (filename, content, mime_type or "application/octet-stream")

    if isinstance(value, dict):
        raw_content = value["content"]
        content = bytes(raw_content) if isinstance(raw_content, bytearray) else raw_content
        filename = value["filename"]
        mime_type = value.get("mime_type") or value.get("mimeType")
        if not mime_type:
            mime_type, _ = mimetypes.guess_type(filename)
        return (filename, content, mime_type or "application/octet-stream")

    handle: IO[bytes] = value
    content = handle.read()
    name = getattr(handle, "name", None)
    filename = Path(name).name if isinstance(name, str) else "file"
    mime_type, _ = mimetypes.guess_type(filename)
    return (filename, content, mime_type or "application/octet-stream")
