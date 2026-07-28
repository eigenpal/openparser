# @openparser/adapters

Pure provider-result → `openparser@1` converters. No HTTP transport, credentials, health checks, figure storage, worker capacity, database, or billing.

## Paddle HPS

```ts
import {
  OCR_PARSE_CONVERTER_VERSION,
  mapLayoutResultsToParsedDocument,
} from '@openparser/adapters/paddle';
```

Pass already-fetched HPS `layoutParsingResults` (and optional page dims / figure URI map). Materializing crops and calling HPS remain host responsibilities.

License: Apache-2.0
