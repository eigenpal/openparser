# openparser jobs

Inspect durable parse and extract jobs.

## Contents

- [Surface](#surface)
- [Commands](#commands)
  - [Core](#core)
- [Details](#details)
  - [`openparser jobs list [options]`](#openparser-jobs-list-options)
  - [`openparser jobs get [options] <jobId>`](#openparser-jobs-get-options-jobid)
  - [`openparser jobs result [options] <jobId>`](#openparser-jobs-result-options-jobid)
  - [`openparser jobs source [options] <jobId>`](#openparser-jobs-source-options-jobid)

## Surface

```
jobs
├── list
├── get <jobId>
├── result <jobId>
└── source <jobId>
```

## Commands

### Core

| Command                                    | Description                               |
| ------------------------------------------ | ----------------------------------------- |
| `openparser jobs list [options]`           | List jobs for the authenticated tenant.   |
| `openparser jobs get [options] <jobId>`    | Fetch a job by id.                        |
| `openparser jobs result [options] <jobId>` | Fetch the terminal result body for a job. |
| `openparser jobs source [options] <jobId>` | Download retained source bytes for a job. |

## Details

### `openparser jobs list [options]`

List jobs for the authenticated tenant.

### Options

| Flag                      | Required | Default | Description                            |
| ------------------------- | -------- | ------- | -------------------------------------- |
| `--cursor <cursor>`       | no       |         | Pagination cursor                      |
| `--limit <n>`             | no       | `50`    | Page size                              |
| `--status <status>`       | no       |         | Filter by job status                   |
| `--operation <operation>` | no       |         | Filter by operation                    |
| `--json`                  | no       |         | Output the raw server response as JSON |
| `--base-url <url>`        | no       |         | OpenParser API base URL                |

### `openparser jobs get [options] <jobId>`

Fetch a job by id.

### Arguments

| Name    | Required | Variadic | Description |
| ------- | -------- | -------- | ----------- |
| `jobId` | yes      | no       |             |

### Options

| Flag                | Required | Default | Description                            |
| ------------------- | -------- | ------- | -------------------------------------- |
| `--cursor <cursor>` | no       |         | Child pagination cursor for batch jobs |
| `--limit <n>`       | no       | `50`    | Child page size                        |
| `--json`            | no       |         | Output the raw server response as JSON |
| `--base-url <url>`  | no       |         | OpenParser API base URL                |

### `openparser jobs result [options] <jobId>`

Fetch the terminal result body for a job.

### Arguments

| Name    | Required | Variadic | Description |
| ------- | -------- | -------- | ----------- |
| `jobId` | yes      | no       |             |

### Options

| Flag                | Required | Default | Description                            |
| ------------------- | -------- | ------- | -------------------------------------- |
| `--format <format>` | no       |         | openparser@1 or raw                    |
| `--json`            | no       |         | Output the raw server response as JSON |
| `--base-url <url>`  | no       |         | OpenParser API base URL                |

### `openparser jobs source [options] <jobId>`

Download retained source bytes for a job.

### Arguments

| Name    | Required | Variadic | Description |
| ------- | -------- | -------- | ----------- |
| `jobId` | yes      | no       |             |

### Options

| Flag                  | Required | Default | Description                             |
| --------------------- | -------- | ------- | --------------------------------------- |
| `-o, --output <path>` | no       |         | Write bytes to a file instead of stdout |
| `--base-url <url>`    | no       |         | OpenParser API base URL                 |
