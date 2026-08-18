import { $ } from 'bun';
import * as esbuild from 'esbuild';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

rmSync(dist, { recursive: true, force: true });

// Bun ≥1.3.14 fails to follow barrel `export { X } from './mod'` edges when the
// entrypoint is a re-export file, emitting `export { X }` with no definition
// (SyntaxError: Export 'X' is not defined). Bundle each public entry with
// esbuild so packed Node ESM always contains the bindings it exports.
await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['./src/index.ts', './src/profile/index.ts'],
  outdir: dist,
  outbase: 'src',
  bundle: true,
  format: 'esm',
  platform: 'node',
  packages: 'external',
  logLevel: 'info',
});

await $`bunx tsc -p tsconfig.build.json`.cwd(root);
