# openparser files

Manage reusable uploaded files.

## Contents

- [Surface](#surface)
- [Commands](#commands)
  - [Core](#core)
- [Details](#details)
  - [`openparser files upload [options] <file>`](#openparser-files-upload-options-file)
  - [`openparser files get [options] <fileId>`](#openparser-files-get-options-fileid)
  - [`openparser files download [options] <fileId>`](#openparser-files-download-options-fileid)
  - [`openparser files delete [options] <fileId>`](#openparser-files-delete-options-fileid)

## Surface

```
files
├── upload <file>
├── get <fileId>
├── download <fileId>
└── delete <fileId>
```

## Commands

### Core

| Command                                        | Description                |
| ---------------------------------------------- | -------------------------- |
| `openparser files upload [options] <file>`     | Upload a file to the pool. |
| `openparser files get [options] <fileId>`      | Fetch file metadata.       |
| `openparser files download [options] <fileId>` | Download file bytes.       |
| `openparser files delete [options] <fileId>`   | Delete a pooled file.      |

## Details

### `openparser files upload [options] <file>`

Upload a file to the pool.

### Arguments

| Name   | Required | Variadic | Description |
| ------ | -------- | -------- | ----------- |
| `file` | yes      | no       |             |

### Options

| Flag               | Required | Default | Description                            |
| ------------------ | -------- | ------- | -------------------------------------- |
| `--json`           | no       |         | Output the raw server response as JSON |
| `--base-url <url>` | no       |         | OpenParser API base URL                |

### `openparser files get [options] <fileId>`

Fetch file metadata.

### Arguments

| Name     | Required | Variadic | Description |
| -------- | -------- | -------- | ----------- |
| `fileId` | yes      | no       |             |

### Options

| Flag               | Required | Default | Description                            |
| ------------------ | -------- | ------- | -------------------------------------- |
| `--json`           | no       |         | Output the raw server response as JSON |
| `--base-url <url>` | no       |         | OpenParser API base URL                |

### `openparser files download [options] <fileId>`

Download file bytes.

### Arguments

| Name     | Required | Variadic | Description |
| -------- | -------- | -------- | ----------- |
| `fileId` | yes      | no       |             |

### Options

| Flag                  | Required | Default | Description                             |
| --------------------- | -------- | ------- | --------------------------------------- |
| `-o, --output <path>` | no       |         | Write bytes to a file instead of stdout |
| `--json`              | no       |         | Output the raw server response as JSON  |
| `--base-url <url>`    | no       |         | OpenParser API base URL                 |

### `openparser files delete [options] <fileId>`

Delete a pooled file.

### Arguments

| Name     | Required | Variadic | Description |
| -------- | -------- | -------- | ----------- |
| `fileId` | yes      | no       |             |

### Options

| Flag               | Required | Default | Description                            |
| ------------------ | -------- | ------- | -------------------------------------- |
| `--json`           | no       |         | Output the raw server response as JSON |
| `--base-url <url>` | no       |         | OpenParser API base URL                |
