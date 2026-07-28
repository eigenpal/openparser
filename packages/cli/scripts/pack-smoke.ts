import { $ } from 'bun';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertExactOpenParserDependencies,
  pinWorkspaceDependenciesToExact,
  serializePackageJsonDeterministic,
} from '../../../scripts/lib/openparser-pack-manifest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sdkRoot = join(root, '../openparser-sdk-typescript');
const work = mkdtempSync(join(tmpdir(), 'openparser-cli-pack-'));

try {
  await $`bun run build`.cwd(sdkRoot);
  await $`bun run build`.cwd(root);

  const dry = (await $`npm pack --dry-run --json --ignore-scripts`.cwd(root).json()) as Array<{
    files: Array<{ path: string }>;
  }>;
  const paths = new Set(dry[0]?.files.map((f) => f.path) ?? []);
  if (!paths.has('dist/cli.js')) throw new Error('missing packed file: dist/cli.js');
  for (const path of paths) {
    if (path.startsWith('src/')) throw new Error(`unexpected packed path: ${path}`);
  }

  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    version: string;
    main?: string;
    types?: string;
    bin?: Record<string, string>;
    dependencies?: Record<string, string>;
  };
  if (pkg.dependencies?.['@openparser/sdk'] !== 'workspace:*') {
    throw new Error('source package.json must keep @openparser/sdk=workspace:*');
  }
  if (pkg.main || pkg.types) {
    throw new Error('CLI package should be bin-only (no main/types)');
  }
  if (pkg.bin?.openparser !== 'dist/cli.js') {
    throw new Error('CLI bin must point at dist/cli.js');
  }

  const lockstepVersion = pkg.version;
  const sdkPkg = JSON.parse(readFileSync(join(sdkRoot, 'package.json'), 'utf8')) as {
    version: string;
  };
  if (sdkPkg.version !== lockstepVersion) {
    throw new Error(`sdk version ${sdkPkg.version} != cli lockstep ${lockstepVersion}`);
  }

  const sdkTgz = (
    await $`npm pack --silent --ignore-scripts --pack-destination ${work}`.cwd(sdkRoot).text()
  ).trim();

  const staged = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  pinWorkspaceDependenciesToExact(staged, lockstepVersion);
  staged.scripts = {};
  assertExactOpenParserDependencies(staged, lockstepVersion, '@openparser/cli');

  const rewriteDir = join(work, 'cli-publish');
  await $`mkdir -p ${rewriteDir}`;
  await $`cp -R ${root}/dist ${root}/LICENSE ${root}/README.md ${root}/CHANGELOG.md ${rewriteDir}/`;
  writeFileSync(join(rewriteDir, 'package.json'), serializePackageJsonDeterministic(staged));
  const cliTgz = (
    await $`npm pack --silent --ignore-scripts --pack-destination ${work}`.cwd(rewriteDir).text()
  ).trim();

  const installDir = join(work, 'consumer');
  mkdirSync(installDir, { recursive: true });
  writeFileSync(
    join(installDir, 'package.json'),
    serializePackageJsonDeterministic({
      name: 'cli-pack-smoke',
      private: true,
      type: 'module',
    })
  );
  // Dependency-order install: sdk first, then cli alone.
  await $`npm install --omit=dev ${join(work, sdkTgz)}`.cwd(installDir).quiet();
  await $`npm install --omit=dev ${join(work, cliTgz)}`.cwd(installDir).quiet();

  const installedCli = JSON.parse(
    readFileSync(join(installDir, 'node_modules/@openparser/cli/package.json'), 'utf8')
  ) as Record<string, unknown>;
  assertExactOpenParserDependencies(installedCli, lockstepVersion, 'installed @openparser/cli');

  const help = await $`./node_modules/.bin/openparser --help`.cwd(installDir).text();
  if (!help.includes('Usage: openparser')) {
    throw new Error('CLI --help did not include expected usage');
  }
  console.log('pack-smoke: @openparser/cli ok');
} finally {
  rmSync(work, { recursive: true, force: true });
}
