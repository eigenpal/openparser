import { describe, expect, it } from 'bun:test';
import { ParsedDocumentSchema } from './document';

const sha256 = 'a'.repeat(64);

describe('@openparser/schema document wire', () => {
  it('accepts a minimal openparser@1 ParsedDocument', () => {
    const doc = ParsedDocumentSchema.parse({
      output_format: 'openparser@1',
      document_id: 'doc_1',
      page_count: 1,
      markdown: 'hello',
      blocks: [
        {
          index: 0,
          page_number: 1,
          kind: 'text',
          text: 'hello',
          bbox: { left: 0, top: 0, right: 10, bottom: 10 },
        },
      ],
    });
    expect(doc.output_format).toBe('openparser@1');
    expect(doc.blocks).toHaveLength(1);
    expect(doc.regions).toEqual([]);
    expect(doc.chunks).toEqual([]);
  });

  it('rejects invalid bounding boxes', () => {
    const result = ParsedDocumentSchema.safeParse({
      output_format: 'openparser@1',
      document_id: 'doc_1',
      page_count: 1,
      markdown: 'hello',
      blocks: [
        {
          index: 0,
          page_number: 1,
          kind: 'text',
          text: 'hello',
          bbox: { left: 10, top: 10, right: 5, bottom: 20 },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts extraction chunks with sha256 ids', () => {
    const doc = ParsedDocumentSchema.parse({
      output_format: 'openparser@1',
      document_id: 'doc_1',
      page_count: 1,
      markdown: 'hello',
      blocks: [
        {
          index: 0,
          page_number: 1,
          kind: 'text',
          text: 'hello',
          bbox: { left: 0, top: 0, right: 10, bottom: 10 },
        },
      ],
      chunks: [
        {
          id: sha256,
          index: 0,
          document_id: 'doc_1',
          text: 'hello',
          content_sha256: sha256,
        },
      ],
    });
    expect(doc.chunks[0]?.id).toBe(sha256);
  });
});
