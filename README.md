# OpenParser

Open OCR wire schemas (`openparser@1`), provider adapters, official SDKs, and CLI.

This repository is the mirrored OpenParser source tree. Packages publish (when
enabled) as:

| Path | Package |
| ---- | ------- |
| `packages/schema` | `@openparser/schema` |
| `packages/adapters` | `@openparser/adapters` |
| `packages/sdk-typescript` | `@openparser/sdk` |
| `packages/sdk-python` | `openparser-sdk` (PyPI; import `openparser`) |
| `packages/cli` | `@openparser/cli` |

The canonical HTTP contract lives at [`docs/OCR_API_OPENAPI.yaml`](docs/OCR_API_OPENAPI.yaml).

## Develop

```bash
bun install
bun run typecheck
bun test
```

Python SDK work uses `uv` inside `packages/sdk-python`.

## License

Apache-2.0 — see [LICENSE](LICENSE).
