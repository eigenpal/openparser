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

| Package | Use for | Source |
| ------- | ------- | ------ |
| [`@openparser/sdk`](https://www.npmjs.com/package/@openparser/sdk) | TypeScript applications | [`packages/sdk-typescript`](packages/sdk-typescript) |
| [`openparser-sdk`](https://pypi.org/project/openparser-sdk/) | Python applications (import `openparser`) | [`packages/sdk-python`](packages/sdk-python) |
| [`@openparser/cli`](https://www.npmjs.com/package/@openparser/cli) | Terminals, CI jobs, and agent tools | [`packages/cli`](packages/cli) |
| [`@openparser/schema`](https://www.npmjs.com/package/@openparser/schema) | Runtime validation and generated types | [`packages/schema`](packages/schema) |
| [`@openparser/adapters`](https://www.npmjs.com/package/@openparser/adapters) | Provider response conversion | [`packages/adapters`](packages/adapters) |

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
