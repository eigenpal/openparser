# @openparser/cli

Parse and extract documents from your terminal, CI jobs, or agent tools.

[Documentation](https://docs.openparser.dev) · [OpenParser](https://openparser.dev)

## Install

```bash
npm i -g @openparser/cli
openparser auth login
```

Set `OPENPARSER_API_KEY` in CI. Use `openparser auth login --profile staging`
and `openparser auth use staging` to manage named profiles.

## Commands

| Command                                       | Purpose                                                      |
| --------------------------------------------- | ------------------------------------------------------------ |
| [`openparser status`](./docs/status.md)       | Verify API connectivity and profile context.                 |
| [`openparser auth`](./docs/auth.md)           | Profile management.                                          |
| [`openparser models`](./docs/models.md)       | OCR and LLM model catalogs.                                  |
| [`openparser parse`](./docs/parse.md)         | Synchronous, async, and batch parse admission.               |
| [`openparser extract`](./docs/extract.md)     | Schema-constrained extraction, batch, and schema suggestion. |
| [`openparser jobs`](./docs/jobs.md)           | List jobs, fetch status, results, and source bytes.          |
| [`openparser files`](./docs/files.md)         | Upload and reuse pooled files.                               |
| [`openparser pipelines`](./docs/pipelines.md) | Saved extraction pipelines.                                  |

Regenerate the command reference under [`docs/`](./docs/) with:

```bash
bun run --cwd packages/cli generate
```

## Stream conventions

- **stdout** carries data payloads (JSON results, file bytes, human tables).
- **stderr** carries status lines (`✓`, `✗`, hints). Use `--json` when scripting.
- `--quiet` / `-q` silences non-error status output on stderr.

## Examples

```bash
openparser status --json
openparser models ocr
openparser parse sync ./invoice.pdf --json | jq .
openparser parse batch --request ./parse-batch.json ./a.pdf ./b.pdf
openparser extract sync ./invoice.pdf --schema ./invoice.schema.json
openparser extract suggest-schema --parse-job-id opj_...
openparser extract batch --request ./extract-batch.json
openparser jobs list --status succeeded --limit 10
openparser files upload ./contract.pdf
```

## Environment variables

| Variable              | Purpose                                                                           |
| --------------------- | --------------------------------------------------------------------------------- |
| `OPENPARSER_API_KEY`  | Bypass profiles for CI. When set, the CLI ignores the saved API key and base URL. |
| `OPENPARSER_BASE_URL` | Override the API origin (default `https://api.openparser.dev`).                   |
| `OPENPARSER_PROFILE`  | One-shell profile switch. Persistent equivalent: `openparser auth use <name>`.    |

Resolution precedence: command-line flags > env vars > active profile > defaults.

## License

[Apache-2.0](./LICENSE)
