# @openparser/adapters

## 1.0.25

### Patch Changes

- f84ad10: A 504 that a gateway marks with `x-openparser-deadline-exceeded: 1` now splits the PDF page range and retries the smaller ranges, the same as the client's own chunk timeout. A plain 504 is unchanged. The header is exported as `HPS_DEADLINE_HEADER`.
- 3b54a3f: Add GLM-OCR as a hosted OCR model (`glm-ocr`). The layout converter can now name the provider that served a document, so GLM-OCR results report Z.ai in their provenance instead of Baidu.
- @openparser/schema@1.0.25

## 1.0.24

### Patch Changes

- @openparser/schema@1.0.24

## 1.0.23

### Patch Changes

- cdfc91d: Refresh integration and tooling dependencies for continued compatibility and maintenance.
- @openparser/schema@1.0.23

## 1.0.22

### Patch Changes

- @openparser/schema@1.0.22

## 1.0.21

### Patch Changes

- f62ff57: `tryBorrowRequestSlot` on the Paddle HPS client may now return a promise, so a caller can check fresh state before lending a GPU slot to an extra PDF chunk lane.
  - @openparser/schema@1.0.21

## 1.0.20

### Patch Changes

- f0f1532: The Paddle HPS client can send several PDF chunks of one document at once: set `pdfChunkConcurrency` and pass `tryBorrowRequestSlot`, which returns a lease on a free GPU slot (`HpsRequestSlotLease`) or null. Lanes past the first run only while a slot is lent; results still merge in page order, and the first failing chunk stops new chunks while those in flight finish.
  - @openparser/schema@1.0.20

## 1.0.19

### Patch Changes

- e2bfcd1: The Paddle HPS client accepts an `onRequestComplete` callback that receives `HpsRequestStats` for every physical GPU request (page range, pages, layout regions, request bytes and time, PDF preparation time), and exports `countLayoutRegions`.
  - @openparser/schema@1.0.19

## 1.0.18

### Patch Changes

- ade68bf: Azure Document Intelligence errors now carry Azure's HTTP status, its most specific error code (for example `InvalidContentDimensions`) and whether Azure rejected the document itself. `AZURE_DI_MAX_IMAGE_SIDE_PX` exports Azure's 10,000 px image limit, and `coordinateScale` on a parse maps page sizes and polygons back to the original image when you send Azure a shrunk copy.
- 496a748: Azure Document Intelligence and Mistral OCR now map a blank page to an empty document with `text` and `markdown` set to `""` instead of throwing, so a blank upload succeeds instead of ending indeterminate.
- 496a748: `MistralOcrError` now carries the HTTP `status` and Mistral's error code as `providerCode`, and its message includes the status. `AwsTextractError` has an `inputRejected` flag, set for `BadDocumentException`, `DocumentTooLargeException` and `UnsupportedDocumentException`.
  - @openparser/schema@1.0.18

## 1.0.17

### Patch Changes

- e3a544d: Tables whose cell spans overlap, which model-generated table HTML sometimes produces, no longer fail the whole parse. Each cell's `rowspan`/`colspan` is fitted to the free grid cells, `rowspan` stops at the last row, and `colspan` is capped at HTML's limit.
  - @openparser/schema@1.0.17

## 1.0.16

### Patch Changes

- @openparser/schema@1.0.16

## 1.0.15

### Patch Changes

- @openparser/schema@1.0.15

## 1.0.14

### Patch Changes

- @openparser/schema@1.0.14

## 1.0.13

### Patch Changes

- @openparser/schema@1.0.13

## 1.0.12

### Patch Changes

- Updated dependencies [12cf02a]
- Updated dependencies [e9e1eeb]
  - @openparser/schema@1.0.12

## 1.0.11

### Patch Changes

- @openparser/schema@1.0.11

## 1.0.10

### Patch Changes

- 812c311: Apply security updates to document validation and processing dependencies.
- Updated dependencies [812c311]
  - @openparser/schema@1.0.10

## 1.0.9

### Patch Changes

- @openparser/schema@1.0.9

## 1.0.8

### Patch Changes

- 8662f3c: PDF layout parsing now keeps detected charts available as figures for cropping and captioning, while still exposing any extracted chart data tables for table consumers.
  - @openparser/schema@1.0.8

## 1.0.7

### Patch Changes

- @openparser/schema@1.0.7

## 1.0.6

### Patch Changes

- @openparser/schema@1.0.6

## 1.0.5

### Patch Changes

- @openparser/schema@1.0.5

## 1.0.4

### Patch Changes

- e0c01f7: PaddleOCR-VL adapters can connect directly to HPS processing endpoints, including bounded PDF parsing, timeout recovery, and canonical OpenParser output.
  - @openparser/schema@1.0.4

## 1.0.3

### Patch Changes

- @openparser/schema@1.0.3

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
