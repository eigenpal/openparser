# @openparser/adapters

Convert provider OCR responses into `openparser@1` document graphs, and call cloud OCR providers with production HTTP/SDK clients.

Inputs use provider-native model ids and options. This package contains no
Eigenpal-hosted aliases, routing catalog, availability policy, or retail prices.

Converters preserve provider hierarchy, text spans and granularity, coordinate
spaces, confidence provenance, styles/languages, structured tables and fields,
and returned image assets in the shared `openparser@1` graph.

**Configuration:** this package never reads environment variables or discovers
credentials on its own. Pass API keys, endpoints, regions, and auth objects into
each client factory. The only exception is normal provider SDK behavior (for
example Google Application Default Credentials or the AWS default credential
chain when you omit explicit auth).

[Documentation](https://docs.openparser.dev/adapters) · [OpenParser](https://openparser.dev)

## Install

```bash
npm install @openparser/adapters
```

Peer-style runtime deps for cloud clients are bundled as package dependencies (`google-auth-library`, `@aws-sdk/client-textract`, `pdf-lib`, `zod`).

## Subpath imports

Prefer subpath imports so tree-shaking and bundlers only pull the provider you need:

| Provider                    | Import path                                        | Adapter + client                                                          |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------- |
| Paddle HPS                  | `@openparser/adapters/paddle`                      | `mapLayoutResultsToParsedDocument`                                        |
| Mistral OCR                 | `@openparser/adapters/mistral`                     | `mapMistralOcrResponseToParsedDocument`, `createHttpMistralOcrClient`     |
| Azure Document Intelligence | `@openparser/adapters/azure-document-intelligence` | `mapAzureDocumentIntelligenceToParsedDocument`, `createHttpAzureDiClient` |
| Google Document AI          | `@openparser/adapters/google-document-ai`          | `mapGoogleDocumentAiToParsedDocument`, `createGoogleDocumentAiClient`     |
| AWS Textract                | `@openparser/adapters/aws-textract`                | `mapAwsTextractToParsedDocument`, `createAwsTextractClient`               |

The root entry `@openparser/adapters` re-exports all adapters and clients, plus package provenance helpers.

## Converter provenance

Artifact `converterVersion` strings use package semver + adapter key (not hand-bumped per-provider constants):

```ts
import {
  OPENPARSER_ADAPTERS_VERSION,
  openparserAdapterConverterVersion,
} from '@openparser/adapters';

openparserAdapterConverterVersion('mistral');
// → `@openparser/adapters@0.1.0#mistral`
```

`OPENPARSER_ADAPTERS_VERSION` is resolved from this package's `package.json` at runtime (and baked into builds). There is no env override — the hosted OCR image is built so that `package.json` matches the public npm lockstep when packages ship in the same platform release (see `docs/surface.md` → Hosted identity lifecycle).

## Provider-native options

Each cloud adapter exports strict Zod schemas and request translators. Hosted catalogs should import these instead of duplicating provider validation:

```ts
import {
  MistralOcr4RequestOptionsSchema,
  mistralOcrOptionsSchemaForModel,
  toMistralOcrNativeRequestBody,
} from '@openparser/adapters/mistral';
```

Model/processor compatibility that is a real provider fact lives here (for example Mistral OCR 4 `include_blocks`, Azure Layout `key_value_pairs`, AWS Detect vs Analyze FeatureTypes).

## Output subset types

Adapters export conservative possible-element-kind document types and capability constants (geometry/assets/annotations may be omitted depending on options and provider response):

```ts
import {
  MISTRAL_OCR_OUTPUT_CAPABILITIES,
  type MistralOcrParsedDocument,
} from '@openparser/adapters/mistral';
```

`@openparser/schema` also exports the structural helper `ParsedDocumentWithElementKinds<K>`.

## Paddle HPS

```ts
import { mapLayoutResultsToParsedDocument } from '@openparser/adapters/paddle';
```

Pass the `layoutParsingResults` returned by HPS. You can also provide page
dimensions and a map of figure URLs.

Your application calls the provider and stores extracted figures. Pass the
response to the adapter for conversion.

## Mistral OCR client

```ts
import { createHttpMistralOcrClient } from '@openparser/adapters/mistral';

const mistralApiKey = loadSecret('mistral-api-key'); // your app's config layer
const client = createHttpMistralOcrClient({ apiKey: mistralApiKey });
const { canonical, nativeResult } = await client.parse({
  bytes: documentBytes,
  mediaType: 'application/pdf',
  documentId: 'doc-1',
  model: 'mistral-ocr-4-0',
  options: { table_format: 'html', include_blocks: true },
});
```

## Azure Document Intelligence client

```ts
import { createHttpAzureDiClient } from '@openparser/adapters/azure-document-intelligence';

const azureConfig = loadAzureDiConfig(); // { endpoint, apiKey } from your config
const client = createHttpAzureDiClient({
  endpoint: azureConfig.endpoint,
  apiKey: azureConfig.apiKey,
});
const { canonical } = await client.parse({
  bytes: documentBytes,
  mediaType: 'application/pdf',
  documentId: 'doc-1',
  modelId: 'prebuilt-layout',
  outputContentFormat: 'markdown',
});
```

## Google Document AI client

```ts
import {
  createAwsWorkloadIdentityGoogleAuth,
  createGoogleDocumentAiClient,
} from '@openparser/adapters/google-document-ai';

const googleConfig = loadGoogleDocAiConfig(); // project, location, processor ids from your config
const client = createGoogleDocumentAiClient({
  projectId: googleConfig.projectId,
  location: googleConfig.location,
  processorId: googleConfig.processorId,
  processorVersionId: googleConfig.processorVersionId,
});
const { canonical } = await client.parse({
  bytes: documentBytes,
  mediaType: 'application/pdf',
  documentId: 'doc-1',
  options: { native_pdf_parsing: true, image_quality_scores: true },
  // imagelessMode: true — omit to use Google's default; set explicitly when you want text-only responses
});
```

Uses Application Default Credentials / Workload Identity Federation when you omit
`auth` (no service-account JSON assumptions). For ECS/Fargate WIF, pass explicit
auth from credentials your runtime already loaded:

```ts
const wifConfig = loadGoogleWifConfig(); // external_account JSON + ECS metadata from your runtime
const client = createGoogleDocumentAiClient({
  ...googleConfig,
  auth: createAwsWorkloadIdentityGoogleAuth({
    externalAccountJson: wifConfig.externalAccountJson,
    region: wifConfig.awsRegion,
    ecsCredentialsRelativeUri: wifConfig.ecsCredentialsRelativeUri,
    ecsAuthorizationToken: wifConfig.ecsAuthorizationToken,
  }),
});
```

Synchronous `ProcessDocument` for Enterprise OCR accepts at most **15 PDF pages** per request.

## AWS Textract client

```ts
import { createAwsTextractClient } from '@openparser/adapters/aws-textract';

const textractConfig = { region: 'us-east-1' }; // from your config; omit region for SDK default chain
const client = createAwsTextractClient({ region: textractConfig.region });
const { canonical } = await client.parse({
  documentId: 'doc-1',
  jobId: 'job-abc-123',
  featureTypes: ['LAYOUT', 'FORMS', 'SIGNATURES', 'QUERIES'],
  queries: ['What is the invoice total?'],
  source: { bucket: 'my-bucket', objectKey: 'sources/.../source' },
});
```

Starts async Textract jobs against an existing S3 object and polls with pagination.

## License

[Apache-2.0](./LICENSE)
