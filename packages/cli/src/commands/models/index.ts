import { createSdkClient } from '../../lib/client';
import { requireApiKey, resolveConfig } from '../../lib/config';
import { table, writeJson } from '../../lib/ui';

interface ModelsOpts {
  baseUrl?: string;
  json?: boolean;
  mode?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export async function modelsOcr(opts: ModelsOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);
  const result = await client.models.ocr();

  if (opts.json) {
    writeJson(result);
    return;
  }

  const rows = (result.data ?? []).map((m) => ({
    id: m.id,
    label: m.label,
    availability: m.availability,
  }));
  console.log(
    table(rows, [
      { key: 'id', header: 'ID' },
      { key: 'label', header: 'Label' },
      { key: 'availability', header: 'Availability' },
    ])
  );
}

export async function modelsLlm(opts: ModelsOpts): Promise<void> {
  const config = resolveConfig(opts);
  requireApiKey(config);
  const client = createSdkClient(config);
  const result = await client.models.llm({
    mode: opts.mode as 'suggested' | 'search' | undefined,
    q: opts.q,
    page: opts.page,
    limit: opts.limit,
  });

  if (opts.json) {
    writeJson(result);
    return;
  }

  const rows = (result.data ?? []).map((m) => ({
    id: m.id,
    label: m.label,
    context: m.context_length ?? '-',
  }));
  console.log(
    table(rows, [
      { key: 'id', header: 'ID' },
      { key: 'label', header: 'Label' },
      { key: 'context', header: 'Context', align: 'right' },
    ])
  );
  if (result.has_more) {
    process.stderr.write('More models available — pass --mode search and --page to paginate.\n');
  }
}
