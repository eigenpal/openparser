import { $ } from 'bun';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertDefinedExports,
  assertExportConditions,
  assertPackedFiles,
} from '../../../scripts/lib/openparser-package-build';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), 'openparser-lineage-pack-'));

try {
  await $`bun run build`.cwd(root);

  assertDefinedExports(join(root, 'dist/index.js'));

  const pkg = JSON.parse(await Bun.file(join(root, 'package.json')).text()) as {
    types?: string;
    exports: Record<string, Record<string, string> | string>;
  };
  if (!pkg.types?.startsWith('./src/')) {
    throw new Error('package types must point at src for clean-checkout typecheck');
  }
  assertExportConditions(pkg.exports);

  await assertPackedFiles({
    root,
    required: [
      'dist/index.js',
      'dist/index.d.ts',
      'src/index.ts',
      'src/document.ts',
      'src/builder.ts',
      'src/prov.ts',
      'lineage.schema.json',
      'README.md',
      'LICENSE',
    ],
    forbiddenReason: (path) => {
      return path.includes('.test.') || path.startsWith('scripts/')
        ? 'unexpected packed path'
        : undefined;
    },
  });

  const tgzName = (
    await $`npm pack --silent --ignore-scripts --pack-destination ${work}`.cwd(root).text()
  ).trim();
  const installDir = join(work, 'consumer');
  mkdirSync(installDir, { recursive: true });
  writeFileSync(
    join(installDir, 'package.json'),
    JSON.stringify(
      {
        name: 'lineage-pack-smoke',
        private: true,
        type: 'module',
        dependencies: { '@openparser/lineage': `file:${join(work, tgzName)}` },
      },
      null,
      2
    )
  );
  await $`npm install --omit=dev`.cwd(installDir).quiet();

  writeFileSync(
    join(installDir, 'smoke.mjs'),
    `import { createRequire } from 'node:module';
import {
  LINEAGE_FORMAT,
  LineageBuilder,
  parseLineageDocument,
  toProvJson,
  topologicalEntityOrder,
} from '@openparser/lineage';
const require = createRequire(import.meta.url);
const resolved = require.resolve('@openparser/lineage');
const schemaPath = require.resolve('@openparser/lineage/schema.json');
if (!resolved.includes('/dist/')) {
  throw new Error('Node import must resolve to dist, got ' + resolved);
}
const schema = JSON.parse(require('node:fs').readFileSync(schemaPath, 'utf8'));
if (schema.properties?.format?.const !== 'lineage@1') {
  throw new Error('packed JSON Schema format mismatch');
}
if (LINEAGE_FORMAT !== 'lineage@1') throw new Error('format constant mismatch');
if (typeof parseLineageDocument !== 'function') throw new Error('parse import failed');
if (typeof LineageBuilder !== 'function') throw new Error('builder import failed');
if (typeof toProvJson !== 'function') throw new Error('prov import failed');
if (typeof topologicalEntityOrder !== 'function') throw new Error('traverse import failed');
const doc = new LineageBuilder()
  .entity('a', { kind: 'value', value: 1 })
  .entity('b', { kind: 'value', value: 2 })
  .activity('t', { type: 'map' })
  .derive({ id: 'd', output: 'b', activity: 't', inputs: ['a'] })
  .withOutputs('b')
  .build();
if (doc.format !== 'lineage@1') throw new Error('build format mismatch');
const prov = toProvJson(doc);
if (!prov.wasGeneratedBy) throw new Error('prov mapping missing wasGeneratedBy');
console.log('ok');
`
  );
  const out = await $`node smoke.mjs`.cwd(installDir).text();
  if (out.trim() !== 'ok') throw new Error(`unexpected smoke output: ${out}`);
  console.log('pack-smoke: @openparser/lineage ok');
} finally {
  rmSync(work, { recursive: true, force: true });
}
