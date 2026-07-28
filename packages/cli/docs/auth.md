# openparser auth

Manage authentication profiles in ~/.config/openparser/credentials.json. Switch with `auth use` or OPENPARSER_PROFILE.

## Contents

- [Surface](#surface)
- [Commands](#commands)
  - [Core](#core)
- [Details](#details)
  - [`openparser auth login [options]`](#openparser-auth-login-options)
  - [`openparser auth logout [options] [profile]`](#openparser-auth-logout-options-profile)
  - [`openparser auth list [options]`](#openparser-auth-list-options)
  - [`openparser auth use [options] <profile>`](#openparser-auth-use-options-profile)

## Surface

```
auth
├── login
├── logout [profile]
├── list
└── use <profile>
```

## Commands

### Core

| Command                                      | Description                                                          |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `openparser auth login [options]`            | Store an API key in a named profile and validate it against the API. |
| `openparser auth logout [options] [profile]` | Remove a saved profile (defaults to the active profile).             |
| `openparser auth list [options]`             | List saved profiles.                                                 |
| `openparser auth use [options] <profile>`    | Switch the persistent active profile.                                |

## Details

### `openparser auth login [options]`

Store an API key in a named profile and validate it against the API.

### Options

| Flag               | Required | Default | Description                                                                     |
| ------------------ | -------- | ------- | ------------------------------------------------------------------------------- |
| `--base-url <url>` | no       |         | OpenParser API base URL                                                         |
| `--profile <name>` | no       |         | Profile name to create or update (default: default). Makes that profile active. |

### `openparser auth logout [options] [profile]`

Remove a saved profile (defaults to the active profile).

### Arguments

| Name      | Required | Variadic | Description |
| --------- | -------- | -------- | ----------- |
| `profile` | no       | no       |             |

### `openparser auth list [options]`

List saved profiles.

### Options

| Flag     | Required | Default | Description                |
| -------- | -------- | ------- | -------------------------- |
| `--json` | no       |         | Emit machine-readable JSON |

### `openparser auth use [options] <profile>`

Switch the persistent active profile.

### Arguments

| Name      | Required | Variadic | Description |
| --------- | -------- | -------- | ----------- |
| `profile` | yes      | no       |             |
