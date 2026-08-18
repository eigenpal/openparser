import { resolve } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { z } from 'zod';
import { LineageDocumentShapeSchema } from '../src/document';

const outputPath = resolve(import.meta.dir, '..', 'lineage.schema.json');
// `io: 'input'` describes documents as they arrive on the wire, which is what a
// validator is handed. The default output view marks every container the parser
// fills in by default as required, and so rejects documents this package itself
// accepts.
const generated = z.toJSONSchema(LineageDocumentShapeSchema, {
  target: 'draft-2020-12',
  reused: 'ref',
  cycles: 'ref',
  io: 'input',
});
const schema = {
  $id: 'https://docs.openparser.dev/schemas/lineage/v1/schema.json',
  title: 'lineage@1',
  description: 'Complete data-derivation DAG wire format.',
  $comment:
    'Shape only. Graph validation additionally requires that every id reference resolves, that each derived entity has exactly one producer, that entity dependencies are acyclic, that member_of targets are collections, and that activity timestamps are ordered.',
  ...generated,
};
const prettierConfig = (await resolveConfig(outputPath)) ?? {};
const expected = await format(JSON.stringify(schema, null, 2), {
  ...prettierConfig,
  filepath: outputPath,
});

if (process.argv.includes('--check')) {
  const actual = await Bun.file(outputPath).text();
  if (actual !== expected) {
    console.error('lineage.schema.json is stale; run `bun run schema:generate`.');
    process.exit(1);
  }
} else {
  await Bun.write(outputPath, expected);
}
