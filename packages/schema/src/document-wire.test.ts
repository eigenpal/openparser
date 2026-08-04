import { describe, expect, it } from 'bun:test';
import { ParsedDocumentSchema } from './index';

describe('@openparser/schema document wire', () => {
  it('accepts a graph-shaped openparser@1 document', () => {
    const doc = ParsedDocumentSchema.parse({
      output_format: 'openparser@1',
      document_id: 'doc_1',
      provenance: { provider: 'example', model: 'ocr-v1' },
      text: 'Invoice total $42',
      markdown: 'hello',
      pages: [
        {
          number: 1,
          width: 100,
          height: 200,
          unit: 'pixel',
          confidence: {
            score: 0.99,
            scope: 'recognition',
            calibrated: false,
            source_value: 0.99,
            source_scale: 'zero_to_one',
          },
          quality: {
            defects: [],
            metrics: [{ name: 'minimum_word_confidence', value: 0.2 }],
          },
          element_ids: ['line-1', 'field-1'],
          reading_order: ['line-1', 'field-1'],
        },
      ],
      elements: [
        {
          id: 'line-1',
          kind: 'text',
          role: 'line',
          text: 'Invoice total $42',
          spans: [{ start: 0, end: 17 }],
          locations: [
            {
              page_number: 1,
              bbox: { left: 1, top: 2, right: 90, bottom: 20 },
              polygon: [
                { x: 1, y: 2 },
                { x: 90, y: 2 },
                { x: 90, y: 20 },
                { x: 1, y: 20 },
              ],
            },
          ],
          confidence: { score: 0.98, scope: 'recognition' },
        },
        {
          id: 'field-1',
          kind: 'key_value',
          key: { text: 'Invoice total', element_ids: ['line-1'] },
          value: { text: '$42', element_ids: ['line-1'] },
        },
      ],
    });
    expect(doc.output_format).toBe('openparser@1');
    expect(doc.elements).toHaveLength(2);
    expect(doc.pages[0]?.reading_order).toEqual(['line-1', 'field-1']);
  });

  it('rejects dangling graph references and geometry outside its page space', () => {
    const result = ParsedDocumentSchema.safeParse({
      output_format: 'openparser@1',
      document_id: 'doc_1',
      provenance: { provider: 'example', model: 'ocr-v1' },
      text: 'hello',
      markdown: 'hello',
      pages: [
        {
          number: 1,
          width: 10,
          height: 10,
          unit: 'pixel',
          element_ids: ['missing'],
        },
      ],
      elements: [
        {
          id: 'line-1',
          kind: 'text',
          role: 'line',
          text: 'hello',
          locations: [
            {
              page_number: 1,
              bbox: { left: 0, top: 0, right: 20, bottom: 5 },
            },
          ],
        },
      ],
      relations: [{ type: 'contains', from_id: 'line-1', to_id: 'missing' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects table cells whose spans exceed the declared grid', () => {
    const result = ParsedDocumentSchema.safeParse({
      output_format: 'openparser@1',
      document_id: 'doc_1',
      provenance: { provider: 'example', model: 'ocr-v1' },
      text: 'value',
      markdown: '| value |',
      pages: [{ number: 1, width: 1, height: 1, unit: 'normalized' }],
      elements: [
        {
          id: 'table-1',
          kind: 'table',
          row_count: 1,
          column_count: 1,
          cells: [
            {
              id: 'cell-1',
              row_index: 0,
              column_index: 0,
              row_span: 2,
              text: 'value',
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects overlapping table cells', () => {
    const result = ParsedDocumentSchema.safeParse({
      output_format: 'openparser@1',
      document_id: 'doc_1',
      provenance: { provider: 'example', model: 'ocr-v1' },
      text: 'value',
      markdown: '| value |',
      pages: [{ number: 1, width: 1, height: 1, unit: 'normalized' }],
      elements: [
        {
          id: 'table-1',
          kind: 'table',
          row_count: 1,
          column_count: 2,
          cells: [
            {
              id: 'merged',
              row_index: 0,
              column_index: 0,
              column_span: 2,
              text: 'merged',
            },
            {
              id: 'constituent',
              row_index: 0,
              column_index: 1,
              text: 'value',
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects rowspan/colspan overlaps with exact partner id', () => {
    const result = ParsedDocumentSchema.safeParse({
      output_format: 'openparser@1',
      document_id: 'doc_spans',
      provenance: { provider: 'example', model: 'ocr-v1' },
      text: 'ab',
      markdown: '| a | b |',
      pages: [{ number: 1, width: 1, height: 1, unit: 'normalized' }],
      elements: [
        {
          id: 'table-spans',
          kind: 'table',
          row_count: 2,
          column_count: 2,
          cells: [
            {
              id: 'anchor',
              row_index: 0,
              column_index: 0,
              row_span: 2,
              column_span: 2,
              text: 'a',
            },
            {
              id: 'intruder',
              row_index: 1,
              column_index: 1,
              text: 'b',
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
    const overlapIssue = result.success
      ? undefined
      : result.error.issues.find((issue) => issue.message.startsWith('table cell overlaps '));
    expect(overlapIssue?.message).toBe('table cell overlaps anchor');
  });

  it('uses UTF-16 code-unit spans without a provider-specific index field', () => {
    const doc = ParsedDocumentSchema.parse({
      output_format: 'openparser@1',
      document_id: 'doc_utf16',
      provenance: { provider: 'example', model: 'ocr-v1' },
      text: '😀A',
      markdown: '😀A',
      pages: [
        {
          number: 1,
          width: 1,
          height: 1,
          unit: 'normalized',
          element_ids: ['emoji'],
          reading_order: ['emoji'],
        },
      ],
      elements: [
        {
          id: 'emoji',
          kind: 'text',
          role: 'symbol',
          text: '😀',
          spans: [{ start: 0, end: 2 }],
        },
      ],
    });
    expect(doc.text.slice(doc.elements[0]?.spans[0]?.start, doc.elements[0]?.spans[0]?.end)).toBe(
      '😀'
    );
    expect('text_index_unit' in doc).toBe(false);
  });

  it('rejects cycles in contains relations, not only self-relations', () => {
    const result = ParsedDocumentSchema.safeParse({
      output_format: 'openparser@1',
      document_id: 'doc_1',
      provenance: { provider: 'example', model: 'ocr-v1' },
      text: 'ab',
      markdown: 'ab',
      pages: [
        {
          number: 1,
          width: 1,
          height: 1,
          unit: 'normalized',
          element_ids: ['a', 'b'],
          reading_order: ['a', 'b'],
        },
      ],
      elements: [
        { id: 'a', kind: 'text', role: 'paragraph', text: 'a' },
        { id: 'b', kind: 'text', role: 'paragraph', text: 'b' },
      ],
      relations: [
        { type: 'contains', from_id: 'a', to_id: 'b' },
        { type: 'contains', from_id: 'b', to_id: 'a' },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          /contains relations must form a DAG/.test(issue.message)
        )
      ).toBe(true);
    }
  });

  it('rejects table cell ids that collide with element ids or repeat across tables', () => {
    const collideWithElement = ParsedDocumentSchema.safeParse({
      output_format: 'openparser@1',
      document_id: 'doc_1',
      provenance: { provider: 'example', model: 'ocr-v1' },
      text: 'value',
      markdown: '| value |',
      pages: [{ number: 1, width: 1, height: 1, unit: 'normalized', element_ids: ['table-1'] }],
      elements: [
        {
          id: 'table-1',
          kind: 'table',
          row_count: 1,
          column_count: 1,
          cells: [{ id: 'table-1', row_index: 0, column_index: 0, text: 'value' }],
        },
      ],
    });
    expect(collideWithElement.success).toBe(false);
    if (!collideWithElement.success) {
      expect(
        collideWithElement.error.issues.some((issue) =>
          /table cell id collides with element id/.test(issue.message)
        )
      ).toBe(true);
    }

    const crossTableDuplicate = ParsedDocumentSchema.safeParse({
      output_format: 'openparser@1',
      document_id: 'doc_1',
      provenance: { provider: 'example', model: 'ocr-v1' },
      text: 'ab',
      markdown: '| a |\n| b |',
      pages: [
        {
          number: 1,
          width: 1,
          height: 1,
          unit: 'normalized',
          element_ids: ['table-a', 'table-b'],
        },
      ],
      elements: [
        {
          id: 'table-a',
          kind: 'table',
          row_count: 1,
          column_count: 1,
          cells: [{ id: 'shared-cell', row_index: 0, column_index: 0, text: 'a' }],
        },
        {
          id: 'table-b',
          kind: 'table',
          row_count: 1,
          column_count: 1,
          cells: [{ id: 'shared-cell', row_index: 0, column_index: 0, text: 'b' }],
        },
      ],
    });
    expect(crossTableDuplicate.success).toBe(false);
    if (!crossTableDuplicate.success) {
      expect(
        crossTableDuplicate.error.issues.some((issue) =>
          /duplicate table cell id across document/.test(issue.message)
        )
      ).toBe(true);
    }
  });
});
