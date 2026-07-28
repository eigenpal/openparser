# @openparser/schema

Public OpenParser OCR wire schemas (`openparser@1`) and OpenAPI generation source.

This package contains provider-neutral request/response Zod schemas, OpenAPI
components, document shapes, and public model-catalog contracts. Runtime,
storage, billing, and provider credentials remain concerns of the host service.

## Imports

```ts
import { ParsedDocumentSchema } from '@openparser/schema';
import { ParseRequestSchema } from '@openparser/schema/http';
import { buildOpenParserOpenApiDocument } from '@openparser/schema/openapi-server';
```

License: Apache-2.0
