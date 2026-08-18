import { describe, expect, it } from 'bun:test';
import publishedSchema from '../lineage.schema.json';
import { LineageDocumentShapeSchema, parseLineageDocument } from './document';

/**
 * Walk every subschema that has `properties`, paired with its `required` list.
 */
function* objectSchemas(
  node: unknown
): Generator<{ properties: Record<string, unknown>; required: string[] }> {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const member of node) yield* objectSchemas(member);
    return;
  }
  const record = node as Record<string, unknown>;
  if (record.properties && typeof record.properties === 'object') {
    yield {
      properties: record.properties as Record<string, unknown>,
      required: Array.isArray(record.required) ? (record.required as string[]) : [],
    };
  }
  for (const value of Object.values(record)) yield* objectSchemas(value);
}

describe('published JSON Schema', () => {
  it('describes documents as they arrive, not as they parse', () => {
    // A field the parser fills in for you is a field the wire may omit. Generating
    // the schema from the parsed shape instead would require all of them, and the
    // published schema would reject documents this package accepts.
    const offenders: string[] = [];
    for (const { properties, required } of objectSchemas(publishedSchema)) {
      for (const name of required) {
        const property = properties[name];
        if (property && typeof property === 'object' && 'default' in property) {
          offenders.push(name);
        }
      }
    }
    expect(offenders).toEqual([]);

    const minimal = { format: 'lineage@1' };
    expect(parseLineageDocument(minimal)).toBeDefined();
    expect(publishedSchema.required).toEqual(
      Object.entries(LineageDocumentShapeSchema.shape)
        .filter(([, member]) => !member.safeParse(undefined).success)
        .map(([name]) => name)
    );
  });
});
