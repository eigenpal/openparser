# openparser models

List OCR and LLM model catalogs.

## Contents

- [Surface](#surface)
- [Commands](#commands)
  - [Core](#core)
- [Details](#details)
  - [`openparser models ocr [options]`](#openparser-models-ocr-options)
  - [`openparser models llm [options]`](#openparser-models-llm-options)

## Surface

```
models
├── ocr
└── llm
```

## Commands

### Core

| Command                           | Description                 |
| --------------------------------- | --------------------------- |
| `openparser models ocr [options]` | List OCR models.            |
| `openparser models llm [options]` | List compatible LLM models. |

## Details

### `openparser models ocr [options]`

List OCR models.

### Options

| Flag               | Required | Default | Description                            |
| ------------------ | -------- | ------- | -------------------------------------- |
| `--json`           | no       |         | Output the raw server response as JSON |
| `--base-url <url>` | no       |         | OpenParser API base URL                |

### `openparser models llm [options]`

List compatible LLM models.

### Options

| Flag               | Required | Default       | Description                            |
| ------------------ | -------- | ------------- | -------------------------------------- |
| `--mode <mode>`    | no       | `"suggested"` | suggested or search                    |
| `--q <query>`      | no       |               | Search query (search mode)             |
| `--page <n>`       | no       | `1`           | Page number                            |
| `--limit <n>`      | no       | `50`          | Page size                              |
| `--json`           | no       |               | Output the raw server response as JSON |
| `--base-url <url>` | no       |               | OpenParser API base URL                |
