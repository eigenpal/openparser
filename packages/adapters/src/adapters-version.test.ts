import { expect, test } from 'bun:test';
import {
  OPENPARSER_ADAPTERS_VERSION,
  OPENPARSER_ADAPTER_KEYS,
  openparserAdapterConverterVersion,
} from './adapters-version';

test('openparserAdapterConverterVersion embeds semver and adapter key', () => {
  for (const key of OPENPARSER_ADAPTER_KEYS) {
    const version = openparserAdapterConverterVersion(key);
    expect(version).toBe(`@openparser/adapters@${OPENPARSER_ADAPTERS_VERSION}#${key}`);
  }
});
