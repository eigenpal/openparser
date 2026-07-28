import type { ExtractRequest, OpenParserClient } from '@openparser/sdk';
import { createSdkClient } from '../../lib/client';
import { requireApiKey, resolveConfig } from '../../lib/config';
import { readFileBlob, readJsonFile } from '../../lib/fs-helpers';
import { success, writeJson } from '../../lib/ui';

type ExtractBatchRequest = Parameters<OpenParserClient['extract']['batch']>[0]['body']['request'];

export interface ExtractOpts {
  baseUrl?: string;
  json?: boolean;
  ocrModel?: string;
  llmModel?: string;
  schema?: string;
  schemaJson?: string;
  fileId?: string;
  parseJobId?: string;
  pipelineId?: string;
  grounding?: string;
  repairAttempts?: number;
  outputFormat?: string;
  idempotencyKey?: string;
}

export interface ExtractBatchOpts {
  baseUrl?: string;
  json?: boolean;
  request: string;
  idempotencyKey?: string;
}

export interface SuggestSchemaOpts {
  baseUrl?: string;
  json?: boolean;
  parseJobId: string;
  hint?: string;
}

function resolveSchema(opts: ExtractOpts): ExtractRequest['schema'] {
  if (opts.schemaJson) return JSON.parse(opts.schemaJson) as ExtractRequest['schema'];
  if (opts.schema) return readJsonFile(opts.schema) as ExtractRequest['schema'];
  throw new Error('Provide --schema <path> or --schema-json.');
}

function assertExtractSource(filePath: string | undefined, opts: ExtractOpts): void {
  const sources = [
    filePath ? 'file' : null,
    opts.fileId ? 'file-id' : null,
    opts.parseJobId ? 'parse-job-id' : null,
  ].filter(Boolean);
  if (sources.length > 1) {
    throw new Error('Provide exactly one source: a file path, --file-id, or --parse-job-id.');
  }
  if (sources.length === 0) {
    throw new Error('Provide a file path, --file-id, or --parse-job-id.');
  }
}

export function buildExtractRequest(opts: ExtractOpts): ExtractRequest {
  if (opts.pipelineId) {
    const request: ExtractRequest = { pipeline_id: opts.pipelineId };
    if (opts.fileId) request.file_id = opts.fileId;
    if (opts.parseJobId) request.parse_job_id = opts.parseJobId;
    return request;
  }

  const request: ExtractRequest = {
    llm_model: opts.llmModel ?? 'openai/gpt-4.1-mini',
    schema: resolveSchema(opts),
  };

  if (opts.parseJobId) {
    // Parse reuse forbids ocr_model / ocr_options on the extract request.
    request.parse_job_id = opts.parseJobId;
  } else {
    request.ocr_model = opts.ocrModel ?? 'paddleocr-vl-1.6';
    if (opts.fileId) request.file_id = opts.fileId;
  }

  if (opts.grounding) {
    request.grounding = opts.grounding as ExtractRequest['grounding'];
  }
  if (opts.repairAttempts !== undefined) {
    request.repair_attempts = opts.repairAttempts;
  }
  if (opts.outputFormat) {
    request.output_format = opts.outputFormat as ExtractRequest['output_format'];
  }

  return request;
}

export async function extractSync(filePath: string | undefined, opts: ExtractOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  assertExtractSource(filePath, opts);

  const client = createSdkClient(config);
  const request = buildExtractRequest(opts);
  const file = filePath ? readFileBlob(filePath) : undefined;
  const result = await client.extract.sync(request, file, {
    idempotencyKey: opts.idempotencyKey,
  });

  writeJson(result);
  if (!opts.json) success('Extraction completed.');
}

export async function extractAsync(filePath: string | undefined, opts: ExtractOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  assertExtractSource(filePath, opts);

  const client = createSdkClient(config);
  const request = buildExtractRequest(opts);
  const file = filePath ? readFileBlob(filePath) : undefined;
  const result = await client.extract.async(request, file, {
    idempotencyKey: opts.idempotencyKey,
  });

  writeJson(result);
  if (!opts.json) success(`Job admitted: ${result.id}`);
}

export async function extractBatch(files: string[], opts: ExtractBatchOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);

  const request = readJsonFile(opts.request) as ExtractBatchRequest;
  if (!request || typeof request !== 'object' || !Array.isArray(request.items)) {
    throw new Error('--request must be a JSON object with an `items` array (ExtractBatchRequest).');
  }

  const client = createSdkClient(config);
  const result = await client.extract.batch({
    body: {
      request,
      files: files.length > 0 ? files.map((path) => readFileBlob(path)) : undefined,
    },
    idempotencyKey: opts.idempotencyKey,
  });

  writeJson(result);
  if (!opts.json) success(`Batch admitted: ${result.id}`);
}

export async function suggestSchema(opts: SuggestSchemaOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);

  const client = createSdkClient(config);
  const result = await client.extract.suggestSchema({
    parse_job_id: opts.parseJobId,
    ...(opts.hint ? { hint: opts.hint } : {}),
  });

  writeJson(result);
  if (!opts.json) success(`Suggested schema: ${result.name}`);
}
