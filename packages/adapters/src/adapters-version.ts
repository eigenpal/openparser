import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Adapter keys used in converter provenance strings.
 * Package semver + key replaces hand-bumped per-provider converter constants.
 *
 * Identity lifecycle (hosted OCR image):
 * - Authoritative semver is this package's `package.json` **inside the image**.
 * - Platform releases that publish OpenParser packages build the OCR image from
 *   the OpenParser prepare commit (`chore(openparser): X.Y.Z`), so the stamped
 *   semver matches the npm package users can inspect for the same converter code.
 * - Platform releases without an OpenParser package publish build from the
 *   platform source SHA; package.json already matches the last published lockstep.
 * - Prepare commits only bump versions/changelogs — converter source equals the
 *   platform source SHA. No env overrides: image package.json is the sole source.
 */
export const OPENPARSER_ADAPTER_KEYS = [
  'paddle',
  'mistral',
  'azure-document-intelligence',
  'google-document-ai',
  'aws-textract',
] as const;

export type OpenParserAdapterKey = (typeof OPENPARSER_ADAPTER_KEYS)[number];

function readAdaptersPackageVersion(): string {
  const require = createRequire(import.meta.url);
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    try {
      const pkg = require(join(dir, 'package.json')) as { name?: string; version?: string };
      if (pkg.name === '@openparser/adapters' && typeof pkg.version === 'string' && pkg.version) {
        return pkg.version;
      }
    } catch {
      // Walk toward package root (src/… or dist/…).
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Could not resolve @openparser/adapters version from package.json');
}

/**
 * Current `@openparser/adapters` package version from package.json.
 * No env reads — build/pack smoke asserts this cannot drift from the published manifest.
 */
export const OPENPARSER_ADAPTERS_VERSION: string = readAdaptersPackageVersion();

/**
 * Provenance string for raw→openparser@1 conversion artifacts.
 * Format: `@openparser/adapters@<semver>#<adapter-key>`
 *
 * Hosted jobs store this on parse artifacts so operators can map a result to the
 * exact public `@openparser/adapters` version that contains the converter used.
 */
export function openparserAdapterConverterVersion(adapter: OpenParserAdapterKey): string {
  return `@openparser/adapters@${OPENPARSER_ADAPTERS_VERSION}#${adapter}`;
}
