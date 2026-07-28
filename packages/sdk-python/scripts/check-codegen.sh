#!/usr/bin/env bash
# Verify committed generated code matches docs/OCR_API_OPENAPI.yaml.
set -euo pipefail

PKG_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$PKG_DIR/src/openparser/_generated"
BACKUP="$(mktemp -d)"

if [ ! -d "$OUT_DIR" ]; then
  echo "✗ Missing generated client at $OUT_DIR — run scripts/codegen.sh"
  exit 1
fi

cp -R "$OUT_DIR"/. "$BACKUP/"
trap 'rm -rf "$BACKUP"' EXIT

"$PKG_DIR/scripts/codegen.sh"

if ! diff -ru "$BACKUP" "$OUT_DIR"; then
  echo "✗ Generated client is out of date. Run packages/sdk-python/scripts/codegen.sh"
  exit 1
fi

echo "✓ Generated client matches OpenAPI spec"
