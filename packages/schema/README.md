# @openparser/schema

Zod schemas and TypeScript types for `openparser@1` document graphs and the
generic raw OCR result envelope.

Use this package to validate parse results at runtime, type document graphs in
TypeScript, and share one canonical graph definition across providers and
runtimes.

[Full reference](https://docs.openparser.dev/schema/openparser-schema) · [OpenParser](https://openparser.dev)

## Install

```bash
npm install @openparser/schema
```

## Import

Import from the package root (`@openparser/schema`):

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

Validate at runtime with `ParsedDocumentSchema.parse(json)`. Narrow adapter
output with `ParsedDocumentWithElementKinds<'text' | 'table'>` when you know
which element kinds a converter may emit.

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
polygon.

All published object schemas are strict. Adding a field or otherwise changing a
shape in a way that an existing schema rejects requires a new `output_format`
revision; `openparser@1` will not silently grow incompatible fields.

Table validation rejects overlapping cells and enforces a structural row-coverage
limit during overlap checks.

## License

[Apache-2.0](./LICENSE)
