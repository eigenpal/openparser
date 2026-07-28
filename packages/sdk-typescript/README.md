# @openparser/sdk

Official TypeScript SDK for the [OpenParser OCR API](https://openparser.dev).

## Install

```bash
npm i @openparser/sdk
```

Requires a TypeScript-aware runtime: Bun, Deno, Node 22+ (native TS), `tsx`, or any modern bundler.

Set `OPENPARSER_API_KEY` or pass `apiKey` explicitly. Keys need `ocr:full` or platform wildcard scope.

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
// Synchronous — waits up to the server sync limit (default 300s).
const result = await client.parse.sync({ ocr_model: 'paddleocr-vl-1.6' }, file);

// Async — returns a durable job reference immediately.
const job = await client.parse.async({ ocr_model: 'paddleocr-vl-1.6' }, file);

// Reuse a pooled file instead of uploading bytes.
await client.parse.sync({ ocr_model: 'paddleocr-vl-1.6', file_id: uploaded.id });
```

Every parse/extract admission requires an idempotency key. The SDK generates one automatically; pass `idempotencyKey` to override.

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
| `timeoutMs`  | —                     | `300000`                     |
| `maxRetries` | —                     | `3`                          |

## Errors

Non-2xx responses throw typed errors (`OpenParserAuthError`, `OpenParserNotFoundError`, `OpenParserRateLimitError`, etc.) with the server `ErrorResponse` envelope attached.

## License

Apache-2.0 — see [LICENSE](./LICENSE).
