import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  OPENPARSER_ADAPTERS_VERSION,
  OPENPARSER_ADAPTER_KEYS,
  openparserAdapterConverterVersion,
} from './adapters-version';

test('OPENPARSER_ADAPTERS_VERSION matches package.json', () => {
  const pkg = JSON.parse(readFileSync(join(import.meta.dir, '../package.json'), 'utf8')) as {
    name: string;
    version: string;
  };
  expect(pkg.name).toBe('@openparser/adapters');
  expect(OPENPARSER_ADAPTERS_VERSION).toBe(pkg.version);
});

test('openparserAdapterConverterVersion embeds semver and adapter key', () => {
  for (const key of OPENPARSER_ADAPTER_KEYS) {
    const version = openparserAdapterConverterVersion(key);
    expect(version).toBe(`@openparser/adapters@${OPENPARSER_ADAPTERS_VERSION}#${key}`);
  }
});
