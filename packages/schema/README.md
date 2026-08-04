# @openparser/schema

Vendor-neutral Zod schemas and TypeScript types for `openparser@1` documents
and the generic raw OCR result envelope.

This package is provider-, model-, and service-agnostic. It intentionally
contains no jobs, HTTP request bodies, hosted model catalogs, pricing, guidance,
availability, extraction pipelines, IDs, curl examples, or other OpenParser
service concepts.

[Full reference](https://docs.openparser.dev/schema/openparser-schema) · [OpenParser](https://openparser.dev)

## Install

```bash
npm install @openparser/schema
```

## Root export only

Import from `@openparser/schema`. There are no `/document` or `/http` subpaths.

```ts
import {
  ParsedDocumentSchema,
  RawParseResultSchema,
  OcrOutputFormatSchema,
  type ParsedDocument,
  type RawParseResult,
  type ParsedDocumentWithElementKinds,
} from '@openparser/schema';
```

## `openparser@1`

The canonical result is a document graph:

- `pages` define explicit coordinate spaces and reading order.
- `elements` preserve text down to words/symbols plus tables, figures,
  formulas, key-values, query answers, selections, signatures, barcodes,
  links, sections, and provider-defined fallback elements.
- `relations` retain hierarchy and semantic links without duplicating trees.
- `text_annotations` preserve range-based languages and styles.
- `assets` retain page and figure images by URI or base64 payload.
- normalized confidence records retain their original value and scale and are
  explicitly uncalibrated across providers. Page-level OCR aggregates use
  `pages[].confidence`; image-quality scores/defects use `pages[].quality`.

`text` is plain reading-order text. Every span is a half-open UTF-16 code-unit
range into that string, so JavaScript consumers can use `text.slice(start, end)`
without provider-specific indexing logic. `markdown` is the canonical
best-effort rendering of the graph; the untouched provider response remains
available through the separate `raw` output format.

`pages[].reading_order` is an ordered subset of that page's `element_ids` and
contains top-level content, not both a parent and all of its descendants.
Word- and symbol-level elements are present only when the provider and requested
options return them. Relation directions are explicit: `contains` points from
parent to child, while `caption_of` and `footnote_of` point from the annotation
to its target.

Geometry always includes a bounding box and may additionally retain the native
polygon. Source provenance retains native ids/types without embedding hosted
routing or pricing policy.

All published object schemas are strict. Adding a field or otherwise changing a
shape in a way that an existing schema rejects requires a new `output_format`
revision; `openparser@1` will not silently grow incompatible fields.

Table validation rejects overlapping cells and enforces a structural row-coverage
limit during overlap checks. Overlap-detection helpers are internal to the package
and are not part of the public export surface.

For hosted API model discovery, request validation, and SDK helpers, use
[@openparser/sdk](https://www.npmjs.com/package/@openparser/sdk) and the
[OpenParser docs](https://docs.openparser.dev/clients/models) — not this package.

## License

[Apache-2.0](./LICENSE)
