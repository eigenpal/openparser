import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPackage } from '../../../scripts/lib/openparser-package-build';

await buildPackage({
  root: join(dirname(fileURLToPath(import.meta.url)), '..'),
  entryPoints: ['./src/index.ts'],
});
