import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createSdkClient } from '../../lib/client';
import { requireApiKey, resolveConfig } from '../../lib/config';
import { readFileBlob } from '../../lib/fs-helpers';
import { success, writeJson } from '../../lib/ui';

interface FilesOpts {
  baseUrl?: string;
  json?: boolean;
}

export async function filesUpload(filePath: string, opts: FilesOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);
  const file = readFileBlob(filePath);
  const result = await client.files.upload(file);
  writeJson(result);
  if (!opts.json) success(`Uploaded ${result.id}`);
}

export async function filesGet(fileId: string, opts: FilesOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);
  const result = await client.files.get(fileId);
  writeJson(result);
}

export async function filesDownload(
  fileId: string,
  opts: FilesOpts & { output?: string }
): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);
  const blob = await client.files.download(fileId);

  if (opts.output) {
    const nodeStream = Readable.fromWeb(
      blob.stream() as unknown as import('stream/web').ReadableStream<Uint8Array>
    );
    await pipeline(nodeStream, createWriteStream(opts.output));
    if (!opts.json) success(`Wrote ${opts.output}`);
    return;
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  process.stdout.write(buffer);
}

export async function filesDelete(fileId: string, opts: FilesOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);
  const result = await client.files.delete(fileId);
  if (opts.json) {
    writeJson(result);
    return;
  }
  success(`Deleted ${fileId}`);
}
