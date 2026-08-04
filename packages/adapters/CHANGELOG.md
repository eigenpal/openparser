# @openparser/adapters

## 1.0.0

### Minor Changes

- 34c31bd: `@openparser/adapters` now ships production clients and canonical `openparser@1` converters for PaddleOCR, Mistral OCR, Azure Document Intelligence, Google Document AI, and AWS Textract. Applications can switch OCR providers while retaining the same document graph, text-span, geometry, table, asset, and confidence semantics.
- 34c31bd: `@openparser/schema` is now document-only: `openparser@1` graph types plus the generic raw OCR envelope. Hosted API request/job/catalog/extraction wire schemas moved out of the published package (private Eigenpal workspace surface). Install `@openparser/schema` for document validation; use the SDKs for the hosted HTTP API.

### Patch Changes

- Updated dependencies [34c31bd]
- Updated dependencies [34c31bd]
  - @openparser/schema@1.0.0

## 0.1.0

### Patch Changes

- fdf6bae: Fix binary downloads in the TypeScript SDK and CLI, detect upload media types in the CLI, preserve Python response fields such as `items`, and publish declarations that work in NodeNext projects.
- Updated dependencies [fdf6bae]
  - @openparser/schema@0.1.0

## 0.0.4

### Patch Changes

- 63a2368: Align package descriptions and CLI help with the public guides, and organize the repository package table by use case.
- Updated dependencies [63a2368]
  - @openparser/schema@0.0.4

## 0.0.3

### Patch Changes

- f241476: Rewrite the public repository and package guides with clearer setup instructions, examples, and contribution steps.
- Updated dependencies [f241476]
  - @openparser/schema@0.0.4

## 0.0.2

### Patch Changes

- f23f255: Make the OpenParser repository easier to navigate with direct links to the website, documentation, source directories, and published packages.
- Updated dependencies [f23f255]
  - @openparser/schema@0.0.3

## 0.0.1

### Minor Changes

- 6483fb4: Initial public release of the OpenParser package suite.
  - `@openparser/schema` — openparser@1 wire schemas and shared types
  - `@openparser/adapters` — provider adapters for OCR backends
  - `@openparser/sdk` — TypeScript client generated from the public OpenAPI contract
  - `openparser-sdk` (PyPI) — Python client (`from openparser import OpenParserClient`)
  - `@openparser/cli` — command-line interface for parse, extract, jobs, and pipelines

  Lockstep version `0.1.0` (minor bump from the `0.0.0` source baseline) keeps the four npm packages and the Python distribution on one suite version.

### Patch Changes

- Updated dependencies [6483fb4]
  - @openparser/schema@0.1.0
