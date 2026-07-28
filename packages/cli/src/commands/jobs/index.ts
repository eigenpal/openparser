import type { Job, JobStatus } from '@openparser/sdk';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createSdkClient } from '../../lib/client';
import { requireApiKey, resolveConfig } from '../../lib/config';
import { formatTimestamp, table, writeJson } from '../../lib/ui';

interface JobsListOpts {
  baseUrl?: string;
  json?: boolean;
  cursor?: string;
  limit?: number;
  status?: string;
  operation?: string;
}

interface JobGetOpts {
  baseUrl?: string;
  json?: boolean;
  cursor?: string;
  limit?: number;
}

interface JobResultOpts {
  baseUrl?: string;
  json?: boolean;
  format?: string;
}

export async function jobsList(opts: JobsListOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);
  const result = await client.jobs.list({
    cursor: opts.cursor,
    limit: opts.limit,
    status: opts.status as JobStatus | undefined,
    operation: opts.operation as Job['operation'] | undefined,
  });

  if (opts.json) {
    writeJson(result);
    return;
  }

  const rows = (result.data ?? []).map((job) => ({
    id: job.id,
    operation: job.operation,
    status: job.status,
    created: formatTimestamp(job.created_at),
  }));
  console.log(
    table(rows, [
      { key: 'id', header: 'ID' },
      { key: 'operation', header: 'Operation' },
      { key: 'status', header: 'Status' },
      { key: 'created', header: 'Created' },
    ])
  );
  if (result.next_cursor) {
    process.stderr.write(`Next page: openparser jobs list --cursor ${result.next_cursor}\n`);
  }
}

export async function jobsGet(jobId: string, opts: JobGetOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);
  const result = await client.jobs.get(jobId, {
    cursor: opts.cursor,
    limit: opts.limit,
  });
  writeJson(result);
}

export async function jobsResult(jobId: string, opts: JobResultOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);
  const result = await client.jobs.result(jobId, {
    format: opts.format as 'openparser@1' | 'raw' | undefined,
  });
  writeJson(result);
}

export async function jobsSource(
  jobId: string,
  opts: { baseUrl?: string; output?: string }
): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);
  const blob = await client.jobs.source(jobId);

  if (opts.output) {
    const nodeStream = Readable.fromWeb(
      blob.stream() as unknown as import('stream/web').ReadableStream<Uint8Array>
    );
    await pipeline(nodeStream, createWriteStream(opts.output));
    return;
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  process.stdout.write(buffer);
}
