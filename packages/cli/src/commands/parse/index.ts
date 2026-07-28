import type { OpenParserClient, ParseRequest } from '@openparser/sdk';
import { createSdkClient } from '../../lib/client';
import { requireApiKey, resolveConfig } from '../../lib/config';
import { readFileBlob, readJsonFile } from '../../lib/fs-helpers';
import { success, writeJson } from '../../lib/ui';

type ParseBatchRequest = Parameters<OpenParserClient['parse']['batch']>[0]['body']['request'];

export interface ParseOpts {
  baseUrl?: string;
  json?: boolean;
  ocrModel?: string;
  outputFormat?: string;
  fileId?: string;
  idempotencyKey?: string;
}

export interface ParseBatchOpts {
  baseUrl?: string;
  json?: boolean;
  request: string;
  idempotencyKey?: string;
}

export function buildParseRequest(opts: ParseOpts): ParseRequest {
  const request: ParseRequest = {
    ocr_model: opts.ocrModel ?? 'paddleocr-vl-1.6',
    output_format: (opts.outputFormat as ParseRequest['output_format']) ?? 'openparser@1',
  };
  if (opts.fileId) request.file_id = opts.fileId;
  return request;
}

function assertParseSource(filePath: string | undefined, opts: ParseOpts): void {
  if (opts.fileId && filePath) {
    throw new Error('Provide either a file path or --file-id, not both.');
  }
  if (!opts.fileId && !filePath) {
    throw new Error('Provide a file path or --file-id.');
  }
}

export async function parseSync(filePath: string | undefined, opts: ParseOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  assertParseSource(filePath, opts);

  const client = createSdkClient(config);
  const request = buildParseRequest(opts);
  const file = filePath ? readFileBlob(filePath) : undefined;
  const result = await client.parse.sync(request, file, {
    idempotencyKey: opts.idempotencyKey,
  });

  writeJson(result);
  if (!opts.json) success('Parse completed.');
}

export async function parseAsync(filePath: string | undefined, opts: ParseOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  assertParseSource(filePath, opts);

  const client = createSdkClient(config);
  const request = buildParseRequest(opts);
  const file = filePath ? readFileBlob(filePath) : undefined;
  const result = await client.parse.async(request, file, {
    idempotencyKey: opts.idempotencyKey,
  });

  writeJson(result);
  if (!opts.json) success(`Job admitted: ${result.id}`);
}

export async function parseBatch(files: string[], opts: ParseBatchOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);

  const request = readJsonFile(opts.request) as ParseBatchRequest;
  if (!request || typeof request !== 'object' || !Array.isArray(request.items)) {
    throw new Error('--request must be a JSON object with an `items` array (ParseBatchRequest).');
  }

  const client = createSdkClient(config);
  const result = await client.parse.batch({
    body: {
      request,
      files: files.length > 0 ? files.map((path) => readFileBlob(path)) : undefined,
    },
    idempotencyKey: opts.idempotencyKey,
  });

  writeJson(result);
  if (!opts.json) success(`Batch admitted: ${result.id}`);
}
