# @openparser/sdk

Parse documents and extract structured data with TypeScript.

[Documentation](https://docs.openparser.dev) · [OpenParser](https://openparser.dev)

## Install

```bash
npm i @openparser/sdk
```

Run the SDK with Bun, Deno, Node 22+, `tsx`, or a TypeScript-aware bundler.

Set `OPENPARSER_API_KEY` or pass `apiKey`. The key needs the `ocr:full` scope or
a platform wildcard scope.

## Quick start

```ts
import { OpenParserClient } from '@openparser/sdk';

const client = new OpenParserClient();

const parsed = await client.parse.sync(
  { ocr_model: 'paddleocr-vl-1.6', output_format: 'openparser@1' },
  file
);
```

## Parse

```ts
// Synchronous: waits up to the server sync limit (default 300s).
const result = await client.parse.sync({ ocr_model: 'paddleocr-vl-1.6' }, file);

// Async: returns a durable job reference immediately.
const job = await client.parse.async({ ocr_model: 'paddleocr-vl-1.6' }, file);

// Reuse a pooled file instead of uploading bytes.
await client.parse.sync({ ocr_model: 'paddleocr-vl-1.6', file_id: uploaded.id });
```

The SDK adds an idempotency key to every parse and extract request. Pass
`idempotencyKey` when you need to control retries.

## Extract

```ts
const extracted = await client.extract.sync(
  {
    ocr_model: 'paddleocr-vl-1.6',
    llm_model: 'openai/gpt-4.1-mini',
    schema: { type: 'object', properties: { total: { type: 'number' } } },
  },
  file
);
```

## Jobs

```ts
const jobs = await client.jobs.list({ status: 'succeeded', limit: 25 });
const job = await client.jobs.get('opj_...');
const parseBody = await client.jobs.result('opj_...', { format: 'openparser@1' });
const bytes = await client.jobs.source('opj_...');
```

## Files

```ts
const uploaded = await client.files.upload(file);
const meta = await client.files.get(uploaded.id);
const content = await client.files.download(uploaded.id);
await client.files.delete(uploaded.id);
```

## Models and pipelines

```ts
const ocrModels = await client.models.ocr();
const llmModels = await client.models.llm({ mode: 'search', q: 'gpt' });

const pipelines = await client.pipelines.list();
const pipeline = await client.pipelines.create({
  name: 'invoice-default',
  ocr_model: 'paddleocr-vl-1.6',
  llm_model: 'openai/gpt-4.1-mini',
  schema: { type: 'object' },
});
```

## Configuration

| Option       | Env fallback          | Default                      |
| ------------ | --------------------- | ---------------------------- |
| `apiKey`     | `OPENPARSER_API_KEY`  | required                     |
| `baseUrl`    | `OPENPARSER_BASE_URL` | `https://api.openparser.dev` |
| `timeoutMs`  |                       | `300000`                     |
| `maxRetries` |                       | `3`                          |

## Errors

The SDK throws typed errors for non-2xx responses, including
`OpenParserAuthError`, `OpenParserNotFoundError`, and
`OpenParserRateLimitError`. Each error exposes the server `ErrorResponse`
through its `envelope` property.

## License

[Apache-2.0](./LICENSE)
