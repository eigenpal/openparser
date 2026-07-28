# OpenParser

Turn PDFs and images into text, layouts, and structured data with one API.

**[Website](https://openparser.dev)** · **[Documentation](https://docs.openparser.dev)**

## Get started

```bash
npm install -g @openparser/cli
openparser auth login
openparser parse sync ./document.pdf --json
```

Choose the [TypeScript SDK](packages/sdk-typescript),
[Python SDK](packages/sdk-python), or [CLI](packages/cli).

## Packages

| Source | Package |
| ------ | ------- |
| [`packages/schema`](https://github.com/eigenpal/openparser/tree/main/packages/schema) | [`@openparser/schema`](https://www.npmjs.com/package/@openparser/schema) |
| [`packages/adapters`](https://github.com/eigenpal/openparser/tree/main/packages/adapters) | [`@openparser/adapters`](https://www.npmjs.com/package/@openparser/adapters) |
| [`packages/sdk-typescript`](https://github.com/eigenpal/openparser/tree/main/packages/sdk-typescript) | [`@openparser/sdk`](https://www.npmjs.com/package/@openparser/sdk) |
| [`packages/sdk-python`](https://github.com/eigenpal/openparser/tree/main/packages/sdk-python) | [`openparser-sdk`](https://pypi.org/project/openparser-sdk/) (import `openparser`) |
| [`packages/cli`](https://github.com/eigenpal/openparser/tree/main/packages/cli) | [`@openparser/cli`](https://www.npmjs.com/package/@openparser/cli) |

## Development

Install the dependencies and run the checks from the repository root:

```bash
bun install
bun run typecheck
bun test
```

Python SDK work uses `uv` inside `packages/sdk-python`.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

[Apache-2.0](LICENSE)
