# @openparser/adapters

## 1.0.2

### Minor Changes

- e7bd767: Grounded extraction now makes every output field explainable. The extraction API can return a portable `lineage@1` derivation DAG connecting values to source text, page geometry, the closest recognition confidence supplied by the OCR model, and every operation that produced them. Downstream systems can append normalization, calculation, inference, and review activities without losing the original evidence.

  The new `@openparser/lineage` package provides runtime schemas, graph validation, traversal and builder helpers, and W3C PROV interoperability for using the same lineage protocol beyond document extraction. `fields()` and `fieldTrace()` return an output field, its confidence, and its supporting evidence directly, so per-field explanations do not require walking the graph.

  Lineage documents stay small enough to return with every extraction. Each field points back to the passage it came from and a single confidence for that passage, without repeating the word-by-word parse that already ships beside it. A typical multi-field result is now a few kilobytes per field, so full evidence arrives with the result rather than being dropped when it grows too large.

  `fields()` and `fieldTrace()` fill in the rest on demand — a field's display path, whether its confidence was reported or derived, and whether it is grounded — so consumers do not have to reconstruct those answers themselves. The document names the model behind each step and keeps the original evidence, not presentation strings.

  OpenParser Studio starts new Playground sessions with field grounding, so clicking a value immediately reveals where it came from. New review endpoints, SDK helpers, and `openparser jobs review` commands let teams confirm field values, or approve or reject a whole extraction, while preserving the original machine output and an attributed event history.

### Patch Changes

- @openparser/schema@1.0.2

## 1.0.1

### Patch Changes

- @openparser/schema@1.0.1

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
