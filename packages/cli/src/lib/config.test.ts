import { describe, expect, it } from 'bun:test';
import { normalizeBaseUrl } from '../commands/auth';
import { resolveConfig } from '../lib/config';
import { studioApiKeysUrl } from '../lib/studio-url';

describe('normalizeBaseUrl', () => {
  it('accepts the public API origin', () => {
    const r = normalizeBaseUrl('https://api.openparser.dev');
    expect(r).toEqual({ ok: true, url: 'https://api.openparser.dev', insecure: false });
  });

  it('auto-prepends https:// for bare hosts', () => {
    const r = normalizeBaseUrl('api.openparser.dev');
    expect(r).toEqual({ ok: true, url: 'https://api.openparser.dev', insecure: false });
  });
});

describe('resolveConfig', () => {
  it('defaults to the public API when nothing is configured', () => {
    const prevKey = process.env.OPENPARSER_API_KEY;
    const prevUrl = process.env.OPENPARSER_BASE_URL;
    delete process.env.OPENPARSER_API_KEY;
    delete process.env.OPENPARSER_BASE_URL;
    try {
      expect(resolveConfig({}).baseUrl).toBe('https://api.openparser.dev');
    } finally {
      if (prevKey) process.env.OPENPARSER_API_KEY = prevKey;
      if (prevUrl) process.env.OPENPARSER_BASE_URL = prevUrl;
    }
  });
});

describe('studioApiKeysUrl', () => {
  it('maps production API to studio dashboard', () => {
    expect(studioApiKeysUrl('https://api.openparser.dev')).toBe(
      'https://studio.openparser.dev/api-keys'
    );
  });

  it('maps staging OCR API to staging studio', () => {
    expect(studioApiKeysUrl('https://sapi.openparser.dev')).toBe(
      'https://staging.openparser.dev/api-keys'
    );
  });

  it('maps local OCR API to local studio', () => {
    expect(studioApiKeysUrl('http://localhost:3100')).toBe('http://localhost:3001/api-keys');
  });

  it('maps api.* hosts to studio.*', () => {
    expect(studioApiKeysUrl('https://api.example.com')).toBe('https://studio.example.com/api-keys');
  });
});
