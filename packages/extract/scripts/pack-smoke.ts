import { $ } from 'bun';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertExactOpenParserDependencies,
  serializePackageJsonDeterministic,
} from '../../../scripts/lib/openparser-pack-manifest';
import {
  assertDefinedExports,
  assertExportConditions,
  assertPackedFiles,
  stagePublishTree,
} from '../../../scripts/lib/openparser-package-build';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schemaRoot = join(root, '../openparser-schema');
const lineageRoot = join(root, '../openparser-lineage');
const work = mkdtempSync(join(tmpdir(), 'openparser-extract-pack-'));

try {
  await $`bun run build`.cwd(schemaRoot);
  await $`bun run build`.cwd(lineageRoot);
  await $`bun run build`.cwd(root);

  assertDefinedExports(join(root, 'dist/index.js'));

  const pkg = JSON.parse(await Bun.file(join(root, 'package.json')).text()) as {
    version: string;
    types?: string;
    dependencies?: Record<string, string>;
    exports: Record<string, Record<string, string>>;
  };
  if (pkg.dependencies?.['@openparser/schema'] !== 'workspace:*') {
    throw new Error('source package.json must keep @openparser/schema=workspace:*');
  }
  if (pkg.dependencies?.['@openparser/lineage'] !== 'workspace:*') {
    throw new Error('source package.json must keep @openparser/lineage=workspace:*');
  }
  if (pkg.dependencies?.['@eigenpal/types']) {
    throw new Error('extract must not depend on @eigenpal/types');
  }
  if (!pkg.dependencies?.zod) {
    throw new Error('extract must depend on zod for grounding wire schemas');
  }
  if (!pkg.dependencies?.ajv || !pkg.dependencies?.['ajv-formats']) {
    throw new Error('extract must depend on ajv and ajv-formats for schema validation');
  }
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
      'src/grounding.ts',
      'src/grounding/lineage.ts',
    ],
    forbiddenReason: (path) =>
      path.includes('.test.') || path.startsWith('scripts/') ? 'unexpected packed path' : undefined,
  });

  const lockstepVersion = pkg.version;
  for (const [label, otherRoot] of [
    ['schema', schemaRoot],
    ['lineage', lineageRoot],
  ] as const) {
    const otherPkg = JSON.parse(readFileSync(join(otherRoot, 'package.json'), 'utf8')) as {
      version: string;
    };
    if (otherPkg.version !== lockstepVersion) {
      throw new Error(
        `${label} version ${otherPkg.version} != extract lockstep ${lockstepVersion}`
      );
    }
  }

  const schemaTgz = (
    await $`npm pack --silent --ignore-scripts --pack-destination ${work}`.cwd(schemaRoot).text()
  ).trim();
  const lineageTgz = (
    await $`npm pack --silent --ignore-scripts --pack-destination ${work}`.cwd(lineageRoot).text()
  ).trim();

  const rewriteDir = join(work, 'extract-publish');
  stagePublishTree({
    root,
    rewriteDir,
    lockstepVersion,
    packageName: '@openparser/extract',
  });

  const extractTgz = (
    await $`npm pack --silent --ignore-scripts --pack-destination ${work}`.cwd(rewriteDir).text()
  ).trim();

  const installDir = join(work, 'consumer');
  mkdirSync(installDir, { recursive: true });
  writeFileSync(
    join(installDir, 'package.json'),
    serializePackageJsonDeterministic({
      name: 'extract-pack-smoke',
      private: true,
      type: 'module',
    })
  );
  await $`npm install --omit=dev ${join(work, schemaTgz)}`.cwd(installDir).quiet();
  await $`npm install --omit=dev ${join(work, lineageTgz)}`.cwd(installDir).quiet();
  await $`npm install --omit=dev ${join(work, extractTgz)}`.cwd(installDir).quiet();

  const installedExtract = JSON.parse(
    readFileSync(join(installDir, 'node_modules/@openparser/extract/package.json'), 'utf8')
  ) as Record<string, unknown>;
  assertExactOpenParserDependencies(
    installedExtract,
    lockstepVersion,
    'installed @openparser/extract'
  );

  writeFileSync(
    join(installDir, 'smoke.mjs'),
    `import { createRequire } from 'node:module';
import {
  ExtractionGroundingResultSchema,
  assertGroundingSchemaSupported,
  buildExtractionLineage,
  normalizeStrictExtractionSchema,
  runGroundedExtraction,
  transformSchemaForGrounding,
  unwrapGroundedOutput,
} from '@openparser/extract';
const require = createRequire(import.meta.url);
const resolved = require.resolve('@openparser/extract');
if (!resolved.includes('/dist/')) {
  throw new Error('Node import must resolve to dist, got ' + resolved);
}
if (typeof transformSchemaForGrounding !== 'function') throw new Error('transform import failed');
if (typeof unwrapGroundedOutput !== 'function') throw new Error('unwrap import failed');
if (typeof runGroundedExtraction !== 'function') throw new Error('run import failed');
if (typeof buildExtractionLineage !== 'function') throw new Error('lineage import failed');
if (typeof normalizeStrictExtractionSchema !== 'function') throw new Error('strict schema import failed');
if (typeof assertGroundingSchemaSupported !== 'function') throw new Error('assert import failed');
if (typeof ExtractionGroundingResultSchema.parse !== 'function') throw new Error('wire schema import failed');
console.log('ok');
`
  );
  const out = await $`node smoke.mjs`.cwd(installDir).text();
  if (out.trim() !== 'ok') throw new Error(`unexpected smoke output: ${out}`);
  console.log('pack-smoke: @openparser/extract ok');
} finally {
  rmSync(work, { recursive: true, force: true });
}
