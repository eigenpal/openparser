# openparser parse

Parse documents.

## Contents

- [Surface](#surface)
- [Commands](#commands)
  - [Core](#core)
- [Details](#details)
  - [`openparser parse sync [options] [file]`](#openparser-parse-sync-options-file)
  - [`openparser parse async [options] [file]`](#openparser-parse-async-options-file)
  - [`openparser parse batch [options] [files...]`](#openparser-parse-batch-options-files)

## Surface

```
parse
├── sync [file]
├── async [file]
└── batch [files...]
```

## Commands

### Core

| Command                                       | Description                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `openparser parse sync [options] [file]`      | Parse synchronously and print the result JSON.                                                  |
| `openparser parse async [options] [file]`     | Admit an async parse job.                                                                       |
| `openparser parse batch [options] [files...]` | Admit a parse batch. Pass --request JSON (ParseBatchRequest); optional files map to file_index. |

## Details

### `openparser parse sync [options] [file]`

Parse synchronously and print the result JSON.

### Arguments

| Name   | Required | Variadic | Description       |
| ------ | -------- | -------- | ----------------- |
| `file` | no       | no       | Document to parse |

### Options

| Flag                      | Required | Default              | Description                                       |
| ------------------------- | -------- | -------------------- | ------------------------------------------------- |
| `--ocr-model <id>`        | no       | `"paddleocr-vl-1.6"` | OCR model id                                      |
| `--output-format <fmt>`   | no       | `"openparser@1"`     | openparser@1 or raw                               |
| `--file-id <id>`          | no       |                      | Reuse a pooled file id instead of uploading bytes |
| `--idempotency-key <key>` | no       |                      | Idempotency-Key header override                   |
| `--json`                  | no       |                      | Output the raw server response as JSON            |
| `--base-url <url>`        | no       |                      | OpenParser API base URL                           |

### `openparser parse async [options] [file]`

Admit an async parse job.

### Arguments

| Name   | Required | Variadic | Description       |
| ------ | -------- | -------- | ----------------- |
| `file` | no       | no       | Document to parse |

### Options

| Flag                      | Required | Default              | Description                                       |
| ------------------------- | -------- | -------------------- | ------------------------------------------------- |
| `--ocr-model <id>`        | no       | `"paddleocr-vl-1.6"` | OCR model id                                      |
| `--output-format <fmt>`   | no       | `"openparser@1"`     | openparser@1 or raw                               |
| `--file-id <id>`          | no       |                      | Reuse a pooled file id instead of uploading bytes |
| `--idempotency-key <key>` | no       |                      | Idempotency-Key header override                   |
| `--json`                  | no       |                      | Output the raw server response as JSON            |
| `--base-url <url>`        | no       |                      | OpenParser API base URL                           |

### `openparser parse batch [options] [files...]`

Admit a parse batch. Pass --request JSON (ParseBatchRequest); optional files map to file_index.

### Arguments

| Name    | Required | Variadic | Description                                        |
| ------- | -------- | -------- | -------------------------------------------------- |
| `files` | no       | yes      | Ordered files referenced by item file_index values |

### Options

| Flag                      | Required | Default | Description                            |
| ------------------------- | -------- | ------- | -------------------------------------- |
| `--request <path>`        | yes      |         | ParseBatchRequest JSON file            |
| `--idempotency-key <key>` | no       |         | Idempotency-Key header override        |
| `--json`                  | no       |         | Output the raw server response as JSON |
| `--base-url <url>`        | no       |         | OpenParser API base URL                |
