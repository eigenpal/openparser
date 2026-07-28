import type { OpenParserClient } from '@openparser/sdk';
import { createSdkClient } from '../../lib/client';
import { requireApiKey, resolveConfig } from '../../lib/config';
import { readJsonFile } from '../../lib/fs-helpers';
import { success, table, writeJson } from '../../lib/ui';

type CreateExtractionPipelineRequest = Parameters<OpenParserClient['pipelines']['create']>[0];
type UpdateExtractionPipelineRequest = Parameters<OpenParserClient['pipelines']['update']>[1];

interface PipelinesOpts {
  baseUrl?: string;
  json?: boolean;
}

interface PipelineCreateOpts extends PipelinesOpts {
  name: string;
  slug?: string;
  schema?: string;
  schemaJson?: string;
  llmModel?: string;
  ocrModel?: string;
  grounding?: string;
  repairAttempts?: number;
  body?: string;
}

interface PipelineUpdateOpts extends PipelinesOpts {
  schema?: string;
  schemaJson?: string;
  llmModel?: string;
  ocrModel?: string;
  name?: string;
  slug?: string;
  grounding?: string;
  repairAttempts?: number;
  body?: string;
}

function readSchema(opts: { schema?: string; schemaJson?: string }): Record<string, unknown> {
  if (opts.schemaJson) return JSON.parse(opts.schemaJson) as Record<string, unknown>;
  if (opts.schema) return readJsonFile(opts.schema) as Record<string, unknown>;
  throw new Error('Provide --schema <path> or --schema-json.');
}

export async function pipelinesList(opts: PipelinesOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);
  const result = await client.pipelines.list();

  if (opts.json) {
    writeJson(result);
    return;
  }

  const rows = (result.items ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    llm: p.llm_model ?? '-',
  }));
  console.log(
    table(rows, [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Name' },
      { key: 'slug', header: 'Slug' },
      { key: 'llm', header: 'LLM' },
    ])
  );
}

export async function pipelinesGet(pipelineId: string, opts: PipelinesOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);
  const result = await client.pipelines.get(pipelineId);
  writeJson(result);
}

export async function pipelinesCreate(opts: PipelineCreateOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);

  const body: CreateExtractionPipelineRequest = opts.body
    ? (JSON.parse(opts.body) as CreateExtractionPipelineRequest)
    : {
        name: opts.name,
        slug: opts.slug,
        schema: readSchema(opts),
        llm_model: opts.llmModel ?? 'openai/gpt-4.1-mini',
        ocr_model: opts.ocrModel ?? 'paddleocr-vl-1.6',
        ...(opts.grounding
          ? { grounding: opts.grounding as CreateExtractionPipelineRequest['grounding'] }
          : {}),
        ...(opts.repairAttempts !== undefined ? { repair_attempts: opts.repairAttempts } : {}),
      };

  const result = await client.pipelines.create(body);
  writeJson(result);
  if (!opts.json) success(`Created pipeline ${result.id}`);
}

export async function pipelinesUpdate(pipelineId: string, opts: PipelineUpdateOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);

  const body: UpdateExtractionPipelineRequest = opts.body
    ? (JSON.parse(opts.body) as UpdateExtractionPipelineRequest)
    : {
        ...(opts.name ? { name: opts.name } : {}),
        ...(opts.slug !== undefined ? { slug: opts.slug === '' ? null : opts.slug } : {}),
        ...(opts.schema || opts.schemaJson ? { schema: readSchema(opts) } : {}),
        ...(opts.llmModel ? { llm_model: opts.llmModel } : {}),
        ...(opts.ocrModel ? { ocr_model: opts.ocrModel } : {}),
        ...(opts.grounding
          ? { grounding: opts.grounding as UpdateExtractionPipelineRequest['grounding'] }
          : {}),
        ...(opts.repairAttempts !== undefined ? { repair_attempts: opts.repairAttempts } : {}),
      };

  if (Object.keys(body).length === 0) {
    throw new Error('Provide at least one field to update.');
  }

  const result = await client.pipelines.update(pipelineId, body);
  writeJson(result);
  if (!opts.json) success(`Updated pipeline ${pipelineId}`);
}

export async function pipelinesDelete(pipelineId: string, opts: PipelinesOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);
  const result = await client.pipelines.delete(pipelineId);
  if (opts.json) {
    writeJson(result);
    return;
  }
  success(`Deleted pipeline ${pipelineId}`);
}
