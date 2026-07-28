# openparser pipelines

Manage saved extraction pipelines.

## Contents

- [Surface](#surface)
- [Commands](#commands)
  - [Core](#core)
- [Details](#details)
  - [`openparser pipelines list [options]`](#openparser-pipelines-list-options)
  - [`openparser pipelines get [options] <pipelineId>`](#openparser-pipelines-get-options-pipelineid)
  - [`openparser pipelines create [options]`](#openparser-pipelines-create-options)
  - [`openparser pipelines update [options] <pipelineId>`](#openparser-pipelines-update-options-pipelineid)
  - [`openparser pipelines delete [options] <pipelineId>`](#openparser-pipelines-delete-options-pipelineid)

## Surface

```
pipelines
├── list
├── get <pipelineId>
├── create
├── update <pipelineId>
└── delete <pipelineId>
```

## Commands

### Core

| Command                                              | Description                         |
| ---------------------------------------------------- | ----------------------------------- |
| `openparser pipelines list [options]`                | List extraction pipelines.          |
| `openparser pipelines get [options] <pipelineId>`    | Fetch a pipeline by id.             |
| `openparser pipelines create [options]`              | Create a saved extraction pipeline. |
| `openparser pipelines update [options] <pipelineId>` | Update a saved extraction pipeline. |
| `openparser pipelines delete [options] <pipelineId>` | Delete a pipeline.                  |

## Details

### `openparser pipelines list [options]`

List extraction pipelines.

### Options

| Flag               | Required | Default | Description                            |
| ------------------ | -------- | ------- | -------------------------------------- |
| `--json`           | no       |         | Output the raw server response as JSON |
| `--base-url <url>` | no       |         | OpenParser API base URL                |

### `openparser pipelines get [options] <pipelineId>`

Fetch a pipeline by id.

### Arguments

| Name         | Required | Variadic | Description |
| ------------ | -------- | -------- | ----------- |
| `pipelineId` | yes      | no       |             |

### Options

| Flag               | Required | Default | Description                            |
| ------------------ | -------- | ------- | -------------------------------------- |
| `--json`           | no       |         | Output the raw server response as JSON |
| `--base-url <url>` | no       |         | OpenParser API base URL                |

### `openparser pipelines create [options]`

Create a saved extraction pipeline.

### Options

| Flag                    | Required | Default                 | Description                               |
| ----------------------- | -------- | ----------------------- | ----------------------------------------- |
| `--name <name>`         | yes      |                         | Pipeline display name                     |
| `--slug <slug>`         | no       |                         | URL-safe slug                             |
| `--schema <path>`       | no       |                         | JSON Schema file                          |
| `--schema-json <json>`  | no       |                         | Inline JSON Schema                        |
| `--llm-model <id>`      | no       | `"openai/gpt-4.1-mini"` | LLM model id                              |
| `--ocr-model <id>`      | no       | `"paddleocr-vl-1.6"`    | OCR model id                              |
| `--grounding <mode>`    | no       |                         | none or field                             |
| `--repair-attempts <n>` | no       |                         | Schema repair attempts (0-2)              |
| `--body <json>`         | no       |                         | Full request JSON (overrides other flags) |
| `--json`                | no       |                         | Output the raw server response as JSON    |
| `--base-url <url>`      | no       |                         | OpenParser API base URL                   |

### `openparser pipelines update [options] <pipelineId>`

Update a saved extraction pipeline.

### Arguments

| Name         | Required | Variadic | Description |
| ------------ | -------- | -------- | ----------- |
| `pipelineId` | yes      | no       |             |

### Options

| Flag                    | Required | Default | Description                                |
| ----------------------- | -------- | ------- | ------------------------------------------ |
| `--name <name>`         | no       |         | New display name                           |
| `--slug <slug>`         | no       |         | URL-safe slug (pass empty string to clear) |
| `--schema <path>`       | no       |         | JSON Schema file                           |
| `--schema-json <json>`  | no       |         | Inline JSON Schema                         |
| `--llm-model <id>`      | no       |         | LLM model id                               |
| `--ocr-model <id>`      | no       |         | OCR model id                               |
| `--grounding <mode>`    | no       |         | none or field                              |
| `--repair-attempts <n>` | no       |         | Schema repair attempts (0-2)               |
| `--body <json>`         | no       |         | Full request JSON (overrides other flags)  |
| `--json`                | no       |         | Output the raw server response as JSON     |
| `--base-url <url>`      | no       |         | OpenParser API base URL                    |

### `openparser pipelines delete [options] <pipelineId>`

Delete a pipeline.

### Arguments

| Name         | Required | Variadic | Description |
| ------------ | -------- | -------- | ----------- |
| `pipelineId` | yes      | no       |             |

### Options

| Flag               | Required | Default | Description                            |
| ------------------ | -------- | ------- | -------------------------------------- |
| `--json`           | no       |         | Output the raw server response as JSON |
| `--base-url <url>` | no       |         | OpenParser API base URL                |
