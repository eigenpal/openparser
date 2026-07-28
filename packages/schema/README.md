# @openparser/schema

Zod schemas and TypeScript types for OpenParser requests, responses, and
`openparser@1` documents.

[Documentation](https://docs.openparser.dev) · [OpenParser](https://openparser.dev)

## Install

```bash
npm install @openparser/schema
```

## Usage

```ts
import { ParsedDocumentSchema } from '@openparser/schema';
import { ParseRequestSchema } from '@openparser/schema/http';
import { buildOpenParserOpenApiDocument } from '@openparser/schema/openapi-server';
```

Use the root export for document types, `/http` for API contracts, and
`/openapi-server` to build the OpenParser OpenAPI document.

## License

[Apache-2.0](./LICENSE)
