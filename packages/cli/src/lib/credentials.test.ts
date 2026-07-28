/**
 * Tests run against a fake `$HOME` so they never touch the real
 * `~/.config/openparser/credentials.json`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

import {
  DEFAULT_PROFILE_NAME,
  activeProfileName,
  deleteProfile,
  getCredentialsPath,
  listProfiles,
  readActiveCredentials,
  setCurrentProfile,
  upsertProfile,
} from './credentials';

const originalHome = process.env.HOME;
const originalProfile = process.env.OPENPARSER_PROFILE;
let fakeHome = '';

beforeEach(() => {
  fakeHome = mkdtempSync(join(tmpdir(), 'openparser-home-'));
  process.env.HOME = fakeHome;
  delete process.env.OPENPARSER_PROFILE;
});

afterEach(() => {
  rmSync(fakeHome, { recursive: true, force: true });
  process.env.HOME = originalHome;
  if (originalProfile !== undefined) process.env.OPENPARSER_PROFILE = originalProfile;
  else delete process.env.OPENPARSER_PROFILE;
});

describe('credentials (profile-based)', () => {
  it('returns null before any profile exists', () => {
    expect(readActiveCredentials()).toBeNull();
    expect(listProfiles().profiles).toEqual({});
  });

  it('upsertProfile without a name falls back to default', () => {
    const name = upsertProfile({ apiKey: 'op_x', baseUrl: 'https://api.openparser.dev' });
    expect(name).toBe(DEFAULT_PROFILE_NAME);
    expect(listProfiles().current).toBe(DEFAULT_PROFILE_NAME);
    expect(readActiveCredentials()?.apiKey).toBe('op_x');
  });

  it('named profiles coexist; setCurrentProfile switches', () => {
    upsertProfile({ apiKey: 'k1', baseUrl: 'https://api.openparser.dev', label: 'prod' }, 'prod');
    upsertProfile(
      { apiKey: 'k2', baseUrl: 'https://sapi.openparser.dev', label: 'staging' },
      'staging'
    );

    expect(listProfiles().current).toBe('staging');
    expect(Object.keys(listProfiles().profiles).sort()).toEqual(['prod', 'staging']);
    expect(readActiveCredentials()?.apiKey).toBe('k2');

    expect(setCurrentProfile('prod')).toBe(true);
    expect(readActiveCredentials()?.apiKey).toBe('k1');
    expect(activeProfileName()).toBe('prod');

    expect(setCurrentProfile('does-not-exist')).toBe(false);
    expect(activeProfileName()).toBe('prod');
  });

  it('OPENPARSER_PROFILE env var overrides persisted current', () => {
    upsertProfile({ apiKey: 'k1', baseUrl: 'https://a.example' }, 'prod');
    upsertProfile({ apiKey: 'k2', baseUrl: 'https://b.example' }, 'staging');
    setCurrentProfile('prod');

    process.env.OPENPARSER_PROFILE = 'staging';
    expect(activeProfileName()).toBe('staging');
    expect(readActiveCredentials()?.apiKey).toBe('k2');
  });

  it('re-upserting a named profile updates credentials in place', () => {
    upsertProfile({ apiKey: 'old', baseUrl: 'https://a.example', label: 'staging' }, 'staging');
    upsertProfile({ apiKey: 'new', baseUrl: 'https://b.example', label: 'staging' }, 'staging');

    expect(Object.keys(listProfiles().profiles)).toEqual(['staging']);
    expect(readActiveCredentials()?.apiKey).toBe('new');
    expect(readActiveCredentials()?.baseUrl).toBe('https://b.example');
  });

  it('deleteProfile advances current to a remaining profile', () => {
    upsertProfile({ apiKey: 'k1', baseUrl: 'https://a.example' }, 'prod');
    upsertProfile({ apiKey: 'k2', baseUrl: 'https://b.example' }, 'staging');
    setCurrentProfile('staging');

    expect(deleteProfile('staging')).toBe(true);
    expect(listProfiles().current).toBe('prod');
    expect(Object.keys(listProfiles().profiles)).toEqual(['prod']);
  });

  it('deleting the last profile removes the credentials file', () => {
    upsertProfile({ apiKey: 'k1', baseUrl: 'https://a.example' }, 'only');
    expect(existsSync(getCredentialsPath())).toBe(true);

    expect(deleteProfile('only')).toBe(true);
    expect(existsSync(getCredentialsPath())).toBe(false);
  });

  it('writes credentials file with 0600 and parent dir with 0700', () => {
    upsertProfile({ apiKey: 'k1', baseUrl: 'https://a.example' }, 'prod');

    const path = getCredentialsPath();
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(statSync(dirname(path)).mode & 0o777).toBe(0o700);
  });
});
