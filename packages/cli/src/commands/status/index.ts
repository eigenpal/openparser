import { OpenParserAuthError } from '@openparser/sdk';
import { createSdkClient } from '../../lib/client';
import { resolveConfig, resolveSource } from '../../lib/config';
import { listProfiles } from '../../lib/credentials';
import { error, ui, warn } from '../../lib/ui';

interface StatusOpts {
  baseUrl?: string;
  json?: boolean;
}

export async function status(opts: StatusOpts): Promise<void> {
  const config = resolveConfig(opts);

  if (!config.apiKey) {
    if (opts.json) {
      console.log(JSON.stringify({ authenticated: false, baseUrl: config.baseUrl }, null, 2));
    } else {
      warn('Not authenticated. Run `openparser auth login` to set an API key.');
    }
    process.exit(1);
  }

  const client = createSdkClient(config);
  let models;
  try {
    models = await client.models.ocr();
  } catch (err) {
    if (err instanceof OpenParserAuthError) {
      if (opts.json) {
        console.log(JSON.stringify({ authenticated: false, baseUrl: config.baseUrl }, null, 2));
      } else {
        error('Authentication check failed. Try `openparser auth login`.');
      }
      process.exit(1);
    }
    throw err;
  }

  const ocrCount = models.data?.length ?? 0;
  const source = resolveSource();
  let profileCount = 0;
  if (source.apiKey === 'profile') {
    try {
      profileCount = Object.keys(listProfiles().profiles).length;
    } catch {
      profileCount = 0;
    }
  }
  const showSourceLine = source.apiKey === 'env' || profileCount > 1;
  const sourceLabel =
    source.apiKey === 'env'
      ? ui.warn('OPENPARSER_API_KEY env var (overrides credentials file)')
      : `profile ${ui.bold(source.profile ?? '?')}`;

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          authenticated: true,
          baseUrl: config.baseUrl,
          ocrModels: ocrCount,
          keySource: source.apiKey,
          profile: source.profile ?? null,
        },
        null,
        2
      )
    );
    return;
  }

  const lines: string[] = [];
  lines.push(`${ui.dim('api:')}       ${config.baseUrl}`);
  lines.push(`${ui.dim('ocr models:')} ${ocrCount}`);
  if (showSourceLine) {
    lines.push(`${ui.dim('key from:')} ${sourceLabel}`);
  }
  console.log(lines.join('\n'));
}
