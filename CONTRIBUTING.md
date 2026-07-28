# Contributing to OpenParser

## Report a bug

[Open an issue](https://github.com/eigenpal/openparser/issues) and include:

- Package name + version (`@openparser/sdk`, `openparser` CLI, etc.)
- The exact command or API call
- The full error output
- Your OS and runtime versions

## Pull requests

Open an issue before changing a public API or wire schema. For a bug fix, include
a reproduction and a test that fails without your change.

## Local development

```bash
bun install
bun run typecheck
bun test
```

Schema and adapter packages are TypeScript source. The TypeScript SDK ships
committed generated clients under `src/generated/`; the Python SDK ships
committed clients under `src/openparser/_generated/`. Update the OpenAPI source,
then regenerate both clients.

## Repository sync

Eigenpal develops OpenParser in its monorepo and publishes reviewed releases to
this repository. Maintainers port accepted public pull requests into that source
before the next release. The release job stops if it finds work that maintainers
have not ported.

## Code of conduct

Treat contributors with respect. Assume good faith and keep discussions focused
on the work.
