/**
 * auth list --json must never leak apiKey material.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { upsertProfile } from '../../lib/credentials';
import { authList, buildAuthListPayload, resolveLoginProfileName } from './index';

const originalHome = process.env.HOME;
let fakeHome = '';
let logs: string[] = [];
const originalLog = console.log;

beforeEach(() => {
  fakeHome = mkdtempSync(join(tmpdir(), 'openparser-auth-list-'));
  process.env.HOME = fakeHome;
  logs = [];
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(' '));
  };
});

afterEach(() => {
  console.log = originalLog;
  rmSync(fakeHome, { recursive: true, force: true });
  process.env.HOME = originalHome;
});

describe('resolveLoginProfileName', () => {
  it('defaults to default when omitted or blank', () => {
    expect(resolveLoginProfileName()).toBe('default');
    expect(resolveLoginProfileName('')).toBe('default');
    expect(resolveLoginProfileName('   ')).toBe('default');
  });

  it('preserves an explicit profile name (trimmed)', () => {
    expect(resolveLoginProfileName('staging')).toBe('staging');
    expect(resolveLoginProfileName('  prod  ')).toBe('prod');
  });
});

describe('auth list --json redaction', () => {
  it('buildAuthListPayload omits apiKey from every profile', () => {
    upsertProfile(
      {
        apiKey: 'op_secret_prod_key_do_not_leak',
        baseUrl: 'https://api.openparser.dev',
        label: 'prod',
      },
      'prod'
    );
    upsertProfile(
      {
        apiKey: 'op_secret_staging_key_do_not_leak',
        baseUrl: 'https://sapi.openparser.dev',
        label: 'staging',
      },
      'staging'
    );

    const payload = buildAuthListPayload();
    expect(payload.current).toBe('staging');
    expect(payload.profiles).toEqual([
      {
        name: 'prod',
        current: false,
        baseUrl: 'https://api.openparser.dev',
        label: 'prod',
      },
      {
        name: 'staging',
        current: true,
        baseUrl: 'https://sapi.openparser.dev',
        label: 'staging',
      },
    ]);

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('apiKey');
    expect(serialized).not.toContain('op_secret_prod_key_do_not_leak');
    expect(serialized).not.toContain('op_secret_staging_key_do_not_leak');
  });

  it('authList --json stdout never includes key material', () => {
    upsertProfile(
      {
        apiKey: 'op_live_super_secret_abcdef',
        baseUrl: 'https://api.openparser.dev',
        label: 'default',
      },
      'default'
    );

    authList({ json: true });

    expect(logs).toHaveLength(1);
    const out = logs[0]!;
    expect(out).not.toContain('apiKey');
    expect(out).not.toContain('op_live_super_secret_abcdef');

    const parsed = JSON.parse(out) as {
      current: string;
      profiles: Array<Record<string, unknown>>;
    };
    expect(parsed.current).toBe('default');
    expect(parsed.profiles).toHaveLength(1);
    expect(parsed.profiles[0]).toEqual({
      name: 'default',
      current: true,
      baseUrl: 'https://api.openparser.dev',
      label: 'default',
    });
    expect('apiKey' in parsed.profiles[0]!).toBe(false);
  });
});
