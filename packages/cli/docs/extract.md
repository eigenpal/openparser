# openparser extract

Extract structured data from documents.

## Contents

- [Surface](#surface)
- [Commands](#commands)
  - [Core](#core)
- [Details](#details)
  - [`openparser extract sync [options] [file]`](#openparser-extract-sync-options-file)
  - [`openparser extract async [options] [file]`](#openparser-extract-async-options-file)
  - [`openparser extract batch [options] [files...]`](#openparser-extract-batch-options-files)
  - [`openparser extract suggest-schema [options]`](#openparser-extract-suggest-schema-options)

## Surface

```
extract
├── sync [file]
├── async [file]
├── batch [files...]
└── suggest-schema
```

## Commands

### Core

| Command                                         | Description                                                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `openparser extract sync [options] [file]`      | Extract synchronously and print the result JSON.                                                     |
| `openparser extract async [options] [file]`     | Admit an async extract job.                                                                          |
| `openparser extract batch [options] [files...]` | Admit an extract batch. Pass --request JSON (ExtractBatchRequest); optional files map to file_index. |
| `openparser extract suggest-schema [options]`   | Suggest an extraction JSON Schema from a succeeded parse job.                                        |

## Details

### `openparser extract sync [options] [file]`

Extract synchronously and print the result JSON.

### Arguments

| Name   | Required | Variadic | Description              |
| ------ | -------- | -------- | ------------------------ |
| `file` | no       | no       | Document to extract from |

### Options

| Flag                      | Required | Default                 | Description                            |
| ------------------------- | -------- | ----------------------- | -------------------------------------- |
| `--ocr-model <id>`        | no       | `"paddleocr-vl-1.6"`    | OCR model id                           |
| `--llm-model <id>`        | no       | `"openai/gpt-4.1-mini"` | LLM model id                           |
| `--schema <path>`         | no       |                         | JSON Schema file for inline extraction |
| `--schema-json <json>`    | no       |                         | Inline JSON Schema string              |
| `--pipeline-id <id>`      | no       |                         | Saved extraction pipeline id           |
| `--file-id <id>`          | no       |                         | Reuse a pooled file id                 |
| `--parse-job-id <id>`     | no       |                         | Reuse a succeeded parse job            |
| `--grounding <mode>`      | no       |                         | none or field                          |
| `--repair-attempts <n>`   | no       |                         | Schema repair attempts (0-2)           |
| `--output-format <fmt>`   | no       |                         | openparser@1 or raw                    |
| `--idempotency-key <key>` | no       |                         | Idempotency-Key header override        |
| `--json`                  | no       |                         | Output the raw server response as JSON |
| `--base-url <url>`        | no       |                         | OpenParser API base URL                |

### `openparser extract async [options] [file]`

Admit an async extract job.

### Arguments

| Name   | Required | Variadic | Description              |
| ------ | -------- | -------- | ------------------------ |
| `file` | no       | no       | Document to extract from |

### Options

| Flag                      | Required | Default                 | Description                            |
| ------------------------- | -------- | ----------------------- | -------------------------------------- |
| `--ocr-model <id>`        | no       | `"paddleocr-vl-1.6"`    | OCR model id                           |
| `--llm-model <id>`        | no       | `"openai/gpt-4.1-mini"` | LLM model id                           |
| `--schema <path>`         | no       |                         | JSON Schema file for inline extraction |
| `--schema-json <json>`    | no       |                         | Inline JSON Schema string              |
| `--pipeline-id <id>`      | no       |                         | Saved extraction pipeline id           |
| `--file-id <id>`          | no       |                         | Reuse a pooled file id                 |
| `--parse-job-id <id>`     | no       |                         | Reuse a succeeded parse job            |
| `--grounding <mode>`      | no       |                         | none or field                          |
| `--repair-attempts <n>`   | no       |                         | Schema repair attempts (0-2)           |
| `--output-format <fmt>`   | no       |                         | openparser@1 or raw                    |
| `--idempotency-key <key>` | no       |                         | Idempotency-Key header override        |
| `--json`                  | no       |                         | Output the raw server response as JSON |
| `--base-url <url>`        | no       |                         | OpenParser API base URL                |

### `openparser extract batch [options] [files...]`

Admit an extract batch. Pass --request JSON (ExtractBatchRequest); optional files map to file_index.

### Arguments

| Name    | Required | Variadic | Description                                        |
| ------- | -------- | -------- | -------------------------------------------------- |
| `files` | no       | yes      | Ordered files referenced by item file_index values |

### Options

| Flag                      | Required | Default | Description                            |
| ------------------------- | -------- | ------- | -------------------------------------- |
| `--request <path>`        | yes      |         | ExtractBatchRequest JSON file          |
| `--idempotency-key <key>` | no       |         | Idempotency-Key header override        |
| `--json`                  | no       |         | Output the raw server response as JSON |
| `--base-url <url>`        | no       |         | OpenParser API base URL                |

### `openparser extract suggest-schema [options]`

Suggest an extraction JSON Schema from a succeeded parse job.

### Options

| Flag                  | Required | Default | Description                                                |
| --------------------- | -------- | ------- | ---------------------------------------------------------- |
| `--parse-job-id <id>` | yes      |         | Succeeded parse job id (opj\_…)                            |
| `--hint <text>`       | no       |         | Optional guidance for the suggestion model (max 500 chars) |
| `--json`              | no       |         | Output the raw server response as JSON                     |
| `--base-url <url>`    | no       |         | OpenParser API base URL                                    |
