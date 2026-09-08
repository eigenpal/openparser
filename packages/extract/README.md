# @openparser/extract

Runtime-neutral grounded extraction algorithm: transform a caller schema,
render source-tagged document text, run the bounded repair loop, resolve
citations, and produce a portable `lineage@1` derivation DAG.

This package has no hosted-service, database, queue, or environment-variable
dependencies. Inject a structured-completion port; receive unwrapped values,
grounding, and lineage out.

[OpenParser](https://openparser.dev) · [Docs](https://docs.openparser.dev)

## Install

```bash
npm install @openparser/extract
```

Runtime packages (`@openparser/schema`, `@openparser/lineage`, `zod`, `ajv`,
`ajv-formats`) are declared as dependencies.

## Import

```ts
import {
  runGroundedExtraction,
  buildExtractionLineage,
  type CompleteStructuredExtraction,
} from '@openparser/extract';

const complete: CompleteStructuredExtraction = async (request) => {
  const response = await yourStructuredCompletion({
    schema: request.schema,
    userMessage: request.userMessage,
  });
  return { content: response.text, inputTokens: response.inputTokens };
};

const result = await runGroundedExtraction({
  schema,
  parsedDocument,
  repairAttempts: 1,
  grounding: 'field',
  complete,
});
```

`runGroundedExtraction` owns prompts, strict-schema normalization, grounded
model-schema prep, source-tagged rendering, the repair loop, JSON/schema
validation, envelope unwrap, and citation assembly. The host injects one
structured-output attempt via `complete` and may pass fencing hooks
(`beforeDispatch` / `afterAttempt` / `requireLease`).

Helpers remain available for hosts that need a step without the loop:
`normalizeStrictExtractionSchema`, `transformSchemaForGrounding`,
`renderGroundedDocument`, `unwrapGroundedOutput`, `buildGroundingResult`.

Then `buildExtractionLineage` / `appendExtractionReviewLineage` for the DAG.

Provider HTTP clients, branding headers, retry fencing persistence, and
env-based credentials stay in the host.

## Wire types

Grounding result schemas (`ExtractionCitationSchema`,
`ExtractionGroundingResultSchema`, and related claim types) live here so
producers do not depend on a hosted API package. Hosted OpenParser HTTP
contracts re-export the same objects.
