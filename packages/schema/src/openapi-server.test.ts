import { describe, expect, it } from 'bun:test';
import { buildOpenParserOpenApiDocument } from './openapi-generate';

describe('@openparser/schema/openapi-server', () => {
  it('builds an OpenAPI document with openparser@1 parse result schemas', () => {
    const doc = buildOpenParserOpenApiDocument() as {
      openapi?: string;
      paths?: Record<string, unknown>;
      components?: { schemas?: Record<string, { const?: unknown; enum?: unknown[] }> };
    };
    const parsedDocument = doc.components?.schemas?.ParsedDocument;
    expect(parsedDocument).toBeDefined();
    const serialized = JSON.stringify(doc);
    expect(serialized).not.toContain('__OPENPARSER_');
  });
});
