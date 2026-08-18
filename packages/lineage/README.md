# @openparser/lineage

Zod schemas, TypeScript types, strict validation, traversal helpers, and a small
builder for **`lineage@1`** — a complete, developer-friendly data-derivation DAG.

The format records _what was produced from what, by which process, under which
agents_, with optional confidence and semantic relations. Semantics are grounded
in [W3C PROV-DM](https://www.w3.org/TR/prov-dm/) while the JSON stays ergonomic
for application code.

[OpenParser](https://openparser.dev) · [Docs](https://docs.openparser.dev)

## Install

```bash
npm install @openparser/lineage
```

Import schemas and helpers from the package root:

```ts
import {
  LINEAGE_FORMAT,
  LineageBuilder,
  parseLineageDocument,
  topologicalEntityOrder,
  toProvJson,
  type LineageDocument,
} from '@openparser/lineage';
```

The package also ships the Draft 2020-12 JSON Schema at
`@openparser/lineage/schema.json`, with canonical id
`https://docs.openparser.dev/schemas/lineage/v1/schema.json`. JSON Schema validates
the wire shape. `parseLineageDocument` additionally enforces reference
resolution, unique producers, and acyclicity.

The package root is `lineage@1` and only `lineage@1`. Rules that read a
namespaced attribute, or that decide what a named confidence method computes,
belong to a profile and ship separately — OpenParser's own live at
`@openparser/lineage/openparser`. Producers other than OpenParser use the root
and need none of it.

## Why `lineage@1`

Many systems need a portable record of how values, files, evidence, and
decisions were derived — not only “this job ran,” but the full dependency graph
of intermediate results. `lineage@1` is that graph:

| Concept        | Role                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| **Entity**     | A value, artifact, evidence item, decision, or collection               |
| **Activity**   | A process that used and/or generated entities                           |
| **Agent**      | A person, organization, or software actor                               |
| **Derivation** | Output-centric edge: one activity produced one output from typed inputs |
| **Relation**   | `member_of`, `specialization_of`, `alternate_of` outside the DAG        |
| **Outputs**    | Which entities are primary results of the document                      |

Derivations are **output-centric**: each derived entity has at most one producer.
Inputs carry optional roles and a `direct` / `indirect` effect flag. Activities
use an open `type` string so profiles can name domain operations without a
format bump.

Append operations preserve existing entities, activities, agents, derivations,
and relations. `outputs` is the current result projection, so an application can
replace that list when a newer derived value becomes its returned result.

Entity `path` values are
[RFC 6901 JSON Pointers](https://www.rfc-editor.org/rfc/rfc6901). A pointer
identifies one exact value; use JSONPath separately when you need a query that
can match several values.

## Example

```ts
import { LineageBuilder, toProvJson } from '@openparser/lineage';

const doc = new LineageBuilder()
  .withId('invoice-extract-1')
  .agent('model', { type: 'software', name: 'extractor@2' })
  .entity('pdf', {
    kind: 'artifact',
    name: 'invoice.pdf',
    locator: { uri: 's3://bucket/invoice.pdf', mediaType: 'application/pdf' },
    digest: { algorithm: 'sha256', value: '…' },
  })
  .entity('total', {
    kind: 'value',
    path: '/total',
    value: 42.5,
    confidence: [
      {
        score: 0.97,
        scale: { min: 0, max: 1 },
        kind: 'reported',
        scope: 'extraction',
        calibrated: false,
      },
    ],
  })
  .activity('extract', {
    type: 'ai.extract',
    status: 'ended',
    startedAt: '2024-06-01T12:00:00.000Z',
    endedAt: '2024-06-01T12:00:02.000Z',
    associations: [{ agent: 'model', role: 'executor' }],
    parameters: { fields: ['total'] },
  })
  .derive({
    id: 'd-total',
    output: 'total',
    activity: 'extract',
    inputs: [{ entity: 'pdf', role: 'document', effect: 'direct' }],
  })
  .withOutputs('total')
  .build();

const prov = toProvJson(doc);
```

## Complete DAG semantics

A document is valid only when the graph is coherent:

- IDs are globally distinct across entities, activities, agents, and derivations
- Every reference resolves (derivation I/O, associations, attributions, confidence sources, outputs, relations)
- Derivation IDs and derived outputs are unique — **one producer per derived output**
- An output cannot appear as its own input
- `member_of` targets must be `collection` entities
- The entity dependency graph induced by derivations is **acyclic**
- Activity timestamps must be RFC 3339 (offset required); `endedAt` must not precede `startedAt`

`parseLineageDocument` and `LineageBuilder.build()` enforce these rules.
Traversal helpers (`topologicalEntityOrder`, `entityAncestors`,
`entityDescendants`) operate on the validated derivation DAG.

## Confidence

Confidence is a first-class assertion, not a naked float:

- `score` plus an explicit numeric `scale` (`min` / `max`) — **not** forced to 0..1, so original provider scales remain representable
- `kind`: `reported` | `derived` | `assessed`
- `scope`, optional `granularity`, `calibrated` flag
- optional typed `sources` (entity, activity, or agent refs), `method`, and `sampleCount`

Uncalibrated scores from different scopes or producers must not be treated as
interchangeable probabilities.

## Extension and profiles

`profiles` lists URIs or short names that declare additional vocabulary for
activity types, selector types, attribute keys, and entity conventions. The core
format stays stable; profiles layer domain meaning.

Derivation inputs reuse OpenLineage's `direct` / `indirect` distinction, and its
transformation vocabulary reads well in `Transformation.type`: `identity`,
`transformation`, `aggregation`, `join`, `group_by`, `filter`,
`sort`, `window`, and `conditional`. `Transformation.type` remains extensible
for domain profiles, and `masking` records whether an operation obscured its
input.

OpenParser extraction lineage uses
`https://docs.openparser.dev/lineage/openparser` to
identify its document-region selectors and extraction conventions.

All published object schemas are **strict**. Incompatible shape changes require a
new `format` revision (`lineage@2`, …).

## W3C PROV mapping

`toProvJson` projects a validated document into [PROV-JSON](https://www.w3.org/Submission/2013/SUBM-prov-json-20130424/)
structures:

| lineage@1                            | PROV-JSON                          |
| ------------------------------------ | ---------------------------------- |
| entities / activities / agents       | `entity` / `activity` / `agent`    |
| derivation (per input)               | `wasDerivedFrom`                   |
| derivation output ← activity         | `wasGeneratedBy`                   |
| derivation input ← activity          | `used`                             |
| activity associations                | `wasAssociatedWith`                |
| entity attributions                  | `wasAttributedTo`                  |
| `member_of`                          | `hadMember`                        |
| `specialization_of` / `alternate_of` | `specializationOf` / `alternateOf` |

Arbitrary lineage ids are deterministically encoded as qualified names in the
declared `lineage` namespace. Entity, activity, and agent records retain their
original id in `lineage:id`.

**Status note:** PROV-JSON is a W3C _Member Submission_. The underlying data model,
[PROV-DM](https://www.w3.org/TR/prov-dm/), is a W3C _Recommendation_. This package
uses PROV-JSON as an interchange projection while treating PROV-DM as the
semantic reference.

## Complementary systems

`lineage@1` records **complete data derivation**. That complements, rather than
replaces:

- **[OpenLineage](https://openlineage.io/)** — job/run and dataset facet events for
  data-platform observability; map runs to activities and datasets to entities
  when you need operational event streams alongside a closed derivation DAG.
- **[OpenTelemetry](https://opentelemetry.io/)** — distributed traces, metrics, and
  logs for runtime performance and debugging; span/trace ids can sit in activity
  `attributes` without conflating telemetry with provenance.

Use those systems for where/when work ran in a fleet; use `lineage@1` for what
each datum depended on.

## License

[Apache-2.0](./LICENSE)
