# Changelog

## 1.0.0

### Minor Changes

- 34c31bd: OpenParser's `openparser@1` response now uses one provider-neutral document graph for text, pages, tables, figures, formulas, key-values, geometry, confidence, and provenance. UTF-16 spans and canonical Markdown make responses predictable across providers, while the updated SDK types expose the complete graph directly.
- 34c31bd: `@openparser/schema` is now document-only: `openparser@1` graph types plus the generic raw OCR envelope. Hosted API request/job/catalog/extraction wire schemas moved out of the published package (private Eigenpal workspace surface). Install `@openparser/schema` for document validation; use the SDKs for the hosted HTTP API.

## 0.1.0

### Patch Changes

- fdf6bae: Fix binary downloads in the TypeScript SDK and CLI, detect upload media types in the CLI, preserve Python response fields such as `items`, and publish declarations that work in NodeNext projects.

## 0.0.4

### Patch Changes

- 63a2368: Align package descriptions and CLI help with the public guides, and organize the repository package table by use case.

## 0.0.3

### Patch Changes

- f241476: Rewrite the public repository and package guides with clearer setup instructions, examples, and contribution steps.

## 0.0.2

### Patch Changes

- f23f255: Make the OpenParser repository easier to navigate with direct links to the website, documentation, source directories, and published packages.

## 0.0.1

### Minor Changes

- 6483fb4: Initial public release of the OpenParser package suite.
  - `@openparser/schema` — openparser@1 wire schemas and shared types
  - `@openparser/adapters` — provider adapters for OCR backends
  - `@openparser/sdk` — TypeScript client generated from the public OpenAPI contract
  - `openparser-sdk` (PyPI) — Python client (`from openparser import OpenParserClient`)
  - `@openparser/cli` — command-line interface for parse, extract, jobs, and pipelines

  Lockstep version `0.1.0` (minor bump from the `0.0.0` source baseline) keeps the four npm packages and the Python distribution on one suite version.
