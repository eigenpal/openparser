import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  note,
  outro,
  password,
  select,
  spinner,
  text,
} from '@clack/prompts';
import { OpenParserAuthError, OpenParserClient } from '@openparser/sdk';
import { exec } from 'child_process';
import { env } from '../../env';
import {
  DEFAULT_PROFILE_NAME,
  deleteProfile,
  listProfiles,
  setCurrentProfile,
  upsertProfile,
} from '../../lib/credentials';
import { studioApiKeysUrl } from '../../lib/studio-url';
import { dim, error, success, ui } from '../../lib/ui';

const CLOUD_API_URL = 'https://api.openparser.dev';

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

function exitOnCancel<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('Cancelled.');
    process.exit(0);
  }
  return value as T;
}

export function normalizeBaseUrl(
  input: string
): { ok: true; url: string; insecure: boolean } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Enter a URL.' };

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: 'Not a valid URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      ok: false,
      error: `Unsupported scheme "${parsed.protocol.replace(':', '')}" — use http or https.`,
    };
  }

  const trailingSlashOnly = /^\/*$/.test(parsed.pathname);
  if (!trailingSlashOnly || parsed.search || parsed.hash) {
    return {
      ok: false,
      error: `URL must be the API origin only (no path/query). Try ${parsed.origin} instead.`,
    };
  }

  const isLoopback =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]';

  const url = parsed.origin.replace(/\/+$/, '');
  const insecure = parsed.protocol === 'http:' && !isLoopback;
  return { ok: true, url, insecure };
}

async function pickBaseUrlInteractive(): Promise<string> {
  const saved = new Map<string, string[]>();
  for (const [name, creds] of Object.entries(listProfiles().profiles)) {
    const raw = creds.baseUrl?.trim();
    if (!raw) continue;
    const norm = normalizeBaseUrl(raw);
    if (!norm.ok || norm.url === CLOUD_API_URL) continue;
    const names = saved.get(norm.url) ?? [];
    names.push(name);
    saved.set(norm.url, names);
  }

  const options: { value: string; label: string; hint?: string }[] = [
    { value: CLOUD_API_URL, label: `OpenParser API (${CLOUD_API_URL})` },
  ];
  for (const [url, profiles] of saved) {
    options.push({ value: url, label: url, hint: `saved profile: ${profiles.join(', ')}` });
  }
  options.push({ value: '__custom__', label: 'Custom URL…', hint: 'paste your own' });

  const picked = exitOnCancel(
    await select<string>({
      message: 'Authenticate against',
      options,
      initialValue: CLOUD_API_URL,
    })
  );

  if (picked !== '__custom__') return picked;

  const custom = exitOnCancel(
    await text({
      message: 'API base URL',
      placeholder: 'https://api.openparser.dev',
      validate: (value) => {
        const norm = normalizeBaseUrl(value ?? '');
        return norm.ok ? undefined : norm.error;
      },
    })
  );
  const norm = normalizeBaseUrl(custom);
  if (!norm.ok) {
    error(norm.error);
    process.exit(1);
  }
  return norm.url;
}

export type AuthLoginOptions = {
  baseUrl?: string;
  /** Named profile to create/update. Defaults to `default`. */
  profile?: string;
};

export function resolveLoginProfileName(profile?: string): string {
  const trimmed = profile?.trim();
  if (!trimmed) return DEFAULT_PROFILE_NAME;
  return trimmed;
}

export async function authLogin(opts: AuthLoginOptions = {}): Promise<void> {
  const flagBaseUrl = opts.baseUrl;
  const profileName = resolveLoginProfileName(opts.profile);

  if (env.CI === 'true' && process.stdin.isTTY !== true) {
    error(
      '`auth login` needs an interactive terminal. In CI, set OPENPARSER_API_KEY (and optionally OPENPARSER_BASE_URL) directly.'
    );
    process.exit(1);
  }

  intro(ui.bold('OpenParser — sign in'));

  const explicit = flagBaseUrl?.trim() || env.OPENPARSER_BASE_URL?.trim();
  let baseUrl: string;
  if (explicit) {
    const norm = normalizeBaseUrl(explicit);
    if (!norm.ok) {
      error(`Invalid base URL "${explicit}": ${norm.error}`);
      process.exit(2);
    }
    baseUrl = norm.url;
  } else {
    if (process.stdin.isTTY !== true) {
      error(
        '`auth login` needs an interactive terminal. Pass --base-url <url> or set OPENPARSER_BASE_URL.'
      );
      process.exit(2);
    }
    baseUrl = await pickBaseUrlInteractive();
  }

  const settingsUrl = studioApiKeysUrl(baseUrl);

  note(
    `${ui.bold('1.')} Open your dashboard:\n` +
      `   ${ui.bold(settingsUrl)}\n` +
      `${ui.bold('2.')} Create an API key with ${ui.bold('ocr:full')} scope.\n` +
      `${ui.bold('3.')} Paste the key here.`,
    'Create an API key'
  );

  const shouldOpen = exitOnCancel(
    await confirm({
      message: 'Open the dashboard in your browser?',
      initialValue: true,
    })
  );
  if (shouldOpen) openBrowser(settingsUrl);

  log.info(`Dashboard URL: ${ui.bold(settingsUrl)}`);

  const key = exitOnCancel(
    await password({
      message: 'Paste your API key',
      mask: '*',
      validate: (value) =>
        value?.trim() ? undefined : 'Paste the key from your dashboard, or press Ctrl-C to cancel.',
    })
  );
  const trimmedKey = key.trim();

  const s = spinner();
  s.start('Validating key with the API');
  try {
    const client = new OpenParserClient({ apiKey: trimmedKey, baseUrl });
    await client.models.ocr();
  } catch (err) {
    s.stop('API key validation failed');
    if (err instanceof OpenParserAuthError) {
      error(err.message);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
  s.stop('Validated');

  const existing = listProfiles().profiles;
  const updated = profileName in existing;
  upsertProfile({ apiKey: trimmedKey, baseUrl, label: profileName }, profileName);
  const action = updated ? 'Updated profile' : 'Saved profile';
  outro(
    `${action} ${ui.bold(profileName)}. Run ${ui.bold('openparser status')} to verify.` +
      (profileName !== DEFAULT_PROFILE_NAME
        ? `\n  Switch later with ${ui.bold(`openparser auth use ${profileName}`)}.`
        : '')
  );
}

export async function authLogout(profile?: string): Promise<void> {
  const removed = deleteProfile(profile);
  if (!removed) {
    error(profile ? `Profile "${profile}" not found.` : 'No profile to remove.');
    process.exit(1);
  }
  success(`Removed profile${profile ? ` ${profile}` : ''}.`);
}

/** Public list rows — never include apiKey or other secret material. */
export type AuthListProfileRow = {
  name: string;
  current: boolean;
  baseUrl: string;
  label: string;
};

export function buildAuthListPayload(): {
  current: string;
  profiles: AuthListProfileRow[];
} {
  const { current, profiles } = listProfiles();
  const rows = Object.entries(profiles).map(([name, creds]) => ({
    name,
    current: name === current,
    baseUrl: creds.baseUrl,
    label: creds.label ?? '',
  }));
  return { current, profiles: rows };
}

export function authList(opts: { json?: boolean }): void {
  const { current, profiles: rows } = buildAuthListPayload();

  if (opts.json) {
    console.log(JSON.stringify({ current, profiles: rows }, null, 2));
    return;
  }

  if (rows.length === 0) {
    dim('No profiles saved. Run `openparser auth login`.');
    return;
  }

  for (const row of rows) {
    const marker = row.current ? ui.ok('*') : ' ';
    console.log(
      `${marker} ${ui.bold(row.name)}  ${ui.dim(row.baseUrl)}${row.label ? `  (${row.label})` : ''}`
    );
  }
}

export async function authUse(name: string): Promise<void> {
  const ok = setCurrentProfile(name);
  if (!ok) {
    error(`Profile "${name}" not found. Run \`openparser auth list\` to see saved profiles.`);
    process.exit(1);
  }
  success(`Switched to profile ${ui.bold(name)}.`);
}
