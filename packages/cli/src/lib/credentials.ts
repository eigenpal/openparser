/**
 * Credentials live in ~/.config/openparser/credentials.json as named profiles.
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';

function credentialsFilePath(): string {
  // eslint-disable-next-line no-process-env
  const home = process.env.HOME ?? homedir();
  return join(home, '.config', 'openparser', 'credentials.json');
}

export const DEFAULT_PROFILE_NAME = 'default';

export interface ProfileCredentials {
  apiKey: string;
  baseUrl: string;
  label?: string;
}

interface CredentialsFile {
  current?: string;
  profiles: Record<string, ProfileCredentials>;
}

export function getCredentialsPath(): string {
  return credentialsFilePath();
}

function readFile(): CredentialsFile | null {
  if (!existsSync(credentialsFilePath())) return null;
  let raw: string;
  try {
    raw = readFileSync(credentialsFilePath(), 'utf-8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed && typeof parsed === 'object') {
    const maybeFile = parsed as CredentialsFile;
    if (maybeFile.profiles && typeof maybeFile.profiles === 'object') {
      return maybeFile;
    }
  }
  return null;
}

function tighten(path: string, mode: number): void {
  try {
    chmodSync(path, mode);
  } catch {
    // intentional no-op
  }
}

function writeFile(file: CredentialsFile): void {
  const path = credentialsFilePath();
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  tighten(dir, 0o700);
  writeFileSync(path, JSON.stringify(file, null, 2) + '\n', {
    encoding: 'utf-8',
    mode: 0o600,
  });
  tighten(path, 0o600);
}

export function listProfiles(): { current: string; profiles: Record<string, ProfileCredentials> } {
  const file = readFile();
  if (!file) return { current: DEFAULT_PROFILE_NAME, profiles: {} };
  return { current: file.current ?? DEFAULT_PROFILE_NAME, profiles: file.profiles };
}

export function readActiveCredentials(profileOverride?: string): ProfileCredentials | null {
  const file = readFile();
  if (!file) return null;
  const name =
    profileOverride ||
    // eslint-disable-next-line no-process-env
    process.env.OPENPARSER_PROFILE ||
    file.current ||
    DEFAULT_PROFILE_NAME;
  const resolved = resolveProfileKey(name, file.profiles) ?? name;
  return file.profiles[resolved] ?? null;
}

export function activeProfileName(profileOverride?: string): string {
  const file = readFile();
  const raw =
    profileOverride ||
    // eslint-disable-next-line no-process-env
    process.env.OPENPARSER_PROFILE ||
    file?.current ||
    DEFAULT_PROFILE_NAME;
  if (!file) return raw;
  return resolveProfileKey(raw, file.profiles) ?? raw;
}

export function upsertProfile(creds: ProfileCredentials, name?: string): string {
  const file = readFile() ?? { profiles: {} };
  const resolvedName = name ?? slugify(creds.label ?? '') ?? DEFAULT_PROFILE_NAME;
  file.profiles[resolvedName] = creds;
  file.current = resolvedName;
  writeFile(file);
  return resolvedName;
}

export function setCurrentProfile(name: string): boolean {
  const file = readFile();
  if (!file) return false;
  const resolved = resolveProfileKey(name, file.profiles);
  if (!resolved) return false;
  file.current = resolved;
  writeFile(file);
  return true;
}

export function deleteProfile(name?: string): boolean {
  const file = readFile();
  if (!file) return false;
  const target = name ?? file.current ?? DEFAULT_PROFILE_NAME;
  if (!file.profiles[target]) return false;
  delete file.profiles[target];
  if (file.current === target) {
    const remaining = Object.keys(file.profiles);
    file.current = remaining[0];
  }
  if (Object.keys(file.profiles).length === 0) {
    const path = credentialsFilePath();
    unlinkSync(path);
    tighten(dirname(path), 0o700);
  } else {
    writeFile(file);
  }
  return true;
}

function slugify(value: string): string | null {
  if (!value) return null;
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || null;
}

export function resolveProfileKey(
  name: string,
  profiles: Record<string, ProfileCredentials>
): string | null {
  if (profiles[name]) return name;
  const normalized = name.trim().toLowerCase();
  for (const [key, creds] of Object.entries(profiles)) {
    if (key.toLowerCase() === normalized) return key;
    if (creds.label?.trim().toLowerCase() === normalized) return key;
  }
  const slug = slugify(name);
  if (slug && profiles[slug]) return slug;
  return null;
}
