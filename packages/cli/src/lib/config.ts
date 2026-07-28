import { env } from '../env';
import { activeProfileName, readActiveCredentials } from './credentials';
import { error, ui } from './ui';

export interface CliConfig {
  baseUrl: string;
  apiKey: string;
}

export type ApiKeySource = 'env' | 'profile' | 'none';

export interface ResolvedSource {
  apiKey: ApiKeySource;
  profile?: string;
}

const DEFAULT_BASE_URL = 'https://api.openparser.dev';

/**
 * Resolve CLI config: flags > env vars > active profile > defaults.
 *
 * When `OPENPARSER_API_KEY` is set, the profile is not consulted for baseUrl.
 */
export function resolveConfig(flags: { baseUrl?: string }): CliConfig {
  const usingEnvKey = !!env.OPENPARSER_API_KEY;
  const profile = usingEnvKey ? null : readActiveCredentials();

  const baseUrl = flags.baseUrl || env.OPENPARSER_BASE_URL || profile?.baseUrl || DEFAULT_BASE_URL;
  const apiKey = env.OPENPARSER_API_KEY || profile?.apiKey || '';

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey,
  };
}

export function resolveSource(): ResolvedSource {
  if (env.OPENPARSER_API_KEY) return { apiKey: 'env' };
  const creds = readActiveCredentials();
  if (creds?.apiKey) return { apiKey: 'profile', profile: activeProfileName() };
  return { apiKey: 'none' };
}

export function requireApiKey(config: CliConfig): string {
  if (!config.apiKey) {
    error('Not authenticated.');
    process.stderr.write(
      `  ${ui.dim('Run')} ${ui.bold('openparser auth login')} ${ui.dim('to add a profile,')}\n` +
        `  ${ui.dim('or set')} ${ui.bold('OPENPARSER_API_KEY')} ${ui.dim('in your env.')}\n`
    );
    process.exit(1);
  }
  return config.apiKey;
}
