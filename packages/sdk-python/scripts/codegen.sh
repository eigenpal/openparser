#!/usr/bin/env bash
# Regenerate the generated Python client from docs/OCR_API_OPENAPI.yaml.
#
# Uses `uv tool run` to invoke openapi-python-client without requiring a
# global install. The generated tree lands at src/openparser/_generated/ and
# is committed; users of the `openparser` PyPI package never run codegen.
#
# Idempotent: safe to run repeatedly. Strips the generator's pyproject.toml
# / README / etc. — we only keep the actual Python package source.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PKG_DIR="$ROOT/packages/sdk-python"
SPEC="$ROOT/docs/OCR_API_OPENAPI.yaml"
OUT_DIR="$PKG_DIR/src/openparser/_generated"
TMP_DIR="$(mktemp -d)"

if [ ! -f "$SPEC" ]; then
  echo "✗ Spec not found at $SPEC."
  exit 1
fi

echo "→ Generating Python client from $SPEC"

cd "$TMP_DIR"
uv tool run --from openapi-python-client@0.28.3 openapi-python-client generate \
  --path "$SPEC" \
  --config "$PKG_DIR/openapi-python-client.config.yaml" \
  --overwrite

GENERATED_DIR="$TMP_DIR/_generated/_generated"
if [ ! -d "$GENERATED_DIR" ]; then
  echo "✗ Expected generated package at $GENERATED_DIR — generator output layout changed."
  ls -la "$TMP_DIR" || true
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp -R "$GENERATED_DIR"/. "$OUT_DIR/"
rm -rf "$TMP_DIR"

python3 - "$OUT_DIR" <<'PY'
from __future__ import annotations

import re
import sys
from pathlib import Path

out_dir = Path(sys.argv[1])

for path in out_dir.rglob("*.py"):
    text = path.read_text()
    lines = [line.rstrip() for line in text.splitlines()]
    while lines and lines[-1] == "":
        lines.pop()
    updated = "\n".join(lines) + "\n"
    if (
        "Unset" in updated
        and "from ...types import" in updated
        and "from ...types import UNSET, Unset" not in updated
    ):
        updated = updated.replace(
            "from ...types import Response, UNSET",
            "from ...types import Response, UNSET, Unset",
        )
    if updated != text:
        path.write_text(updated)

# Binary download endpoints should return bytes, not openapi-python-client File wrappers.
# Generator currently emits ErrorResponse | File (historically ApiErrorResponse | File)
# and one File(payload=BytesIO(...)) block per documented binary success status (200, 206, …).
_FILE_IMPORT = re.compile(
    r"^from \.\.\.types import File(?:, FileTypes)?\n",
    re.MULTILINE,
)
_BYTESIO_IMPORT = re.compile(r"^from io import BytesIO\n", re.MULTILINE)
_FILE_WRAPPER = re.compile(
    r"response_(\d+)\s*=\s*File\(\s*payload\s*=\s*BytesIO\(response\.content\)\s*\)",
    re.MULTILINE,
)
# Word-boundary File only — never PublicFile / CreateFileBody / FileTypes / etc.
_FILE_TYPE = re.compile(r"(?<![A-Za-z0-9_])File(?![A-Za-z0-9_])")

def _word_used(source: str, name: str) -> bool:
    return re.search(rf"(?<![A-Za-z0-9_]){re.escape(name)}(?![A-Za-z0-9_])", source) is not None


for relative in [
    "api/jobs/get_job_source.py",
    "api/files/get_file_content.py",
]:
    path = out_dir / relative
    if not path.exists():
        continue
    text = path.read_text()
    text = _FILE_IMPORT.sub("", text)
    text = _BYTESIO_IMPORT.sub("", text)
    text = _FILE_WRAPPER.sub(r"response_\1 = response.content", text)
    text = _FILE_TYPE.sub("bytes", text)
    # Generator emits a second `from typing import cast` after model imports.
    text = re.sub(r"\nfrom typing import cast\n", "\n", text, count=1)
    if not _word_used(
        text.replace("from ...types import Response, UNSET", "from ...types import Response"),
        "UNSET",
    ):
        text = text.replace(
            "from ...types import Response, UNSET\n",
            "from ...types import Response\n",
        )
    if "cast(" not in text:
        text = text.replace("from typing import Any, cast\n", "from typing import Any\n")
    if re.search(r"(?<![A-Za-z0-9_])(?:File|BytesIO)(?![A-Za-z0-9_])", text):
        raise SystemExit(
            f"✗ Binary endpoint postprocess left File/BytesIO references in {relative}"
        )
    path.write_text(text)
PY

echo "✓ Wrote generated client to $OUT_DIR"
