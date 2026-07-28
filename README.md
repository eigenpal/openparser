# OpenParser

Open OCR wire schemas (`openparser@1`), provider adapters, official SDKs, and CLI.

**[Website](https://openparser.dev)** · **[Documentation](https://docs.openparser.dev)**

This repository is the mirrored OpenParser source tree. Packages publish (when
enabled) as:

| Source | Package |
| ------ | ------- |
| [`packages/schema`](https://github.com/eigenpal/openparser/tree/main/packages/schema) | [`@openparser/schema`](https://www.npmjs.com/package/@openparser/schema) |
| [`packages/adapters`](https://github.com/eigenpal/openparser/tree/main/packages/adapters) | [`@openparser/adapters`](https://www.npmjs.com/package/@openparser/adapters) |
| [`packages/sdk-typescript`](https://github.com/eigenpal/openparser/tree/main/packages/sdk-typescript) | [`@openparser/sdk`](https://www.npmjs.com/package/@openparser/sdk) |
| [`packages/sdk-python`](https://github.com/eigenpal/openparser/tree/main/packages/sdk-python) | [`openparser-sdk`](https://pypi.org/project/openparser-sdk/) (import `openparser`) |
| [`packages/cli`](https://github.com/eigenpal/openparser/tree/main/packages/cli) | [`@openparser/cli`](https://www.npmjs.com/package/@openparser/cli) |

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
