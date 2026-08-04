import { ParsedDocumentSchema } from '@openparser/schema';
import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AwsTextractAdapterError,
  mapAwsTextractToParsedDocument,
  type MapAwsTextractInput,
} from './index';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/aws-textract');

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('mapAwsTextractToParsedDocument golden fixtures', () => {
  const inputs = readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith('.input.json'))
    .sort();

  for (const inputName of inputs) {
    const stem = inputName.replace(/\.input\.json$/, '');
    test(stem, () => {
      const input = loadJson<MapAwsTextractInput>(join(FIXTURES_DIR, inputName));
      const actual = mapAwsTextractToParsedDocument(input);
      expect(ParsedDocumentSchema.parse(actual).document_id).toBe(input.documentId);
      expect(actual.output_format).toBe('openparser@1');
      expect(actual.pages).toHaveLength(input.response.page_count);
      expect(actual.elements.length).toBeGreaterThan(0);
    });
  }
});

describe('mapAwsTextractToParsedDocument unit cases', () => {
  test('rejects responses without blocks or invalid page_count', () => {
    expect(() =>
      mapAwsTextractToParsedDocument({
        documentId: 'doc',
        response: {
          page_count: 1,
          blocks: undefined as unknown as Record<string, unknown>[],
        },
      })
    ).toThrow(AwsTextractAdapterError);

    expect(() =>
      mapAwsTextractToParsedDocument({
        documentId: 'doc',
        response: {
          page_count: 0,
          blocks: [],
        },
      })
    ).toThrow(AwsTextractAdapterError);
  });

  test('keeps LINE blocks with overlapping geometry on a different page', () => {
    const parsed = mapAwsTextractToParsedDocument({
      documentId: 'doc',
      response: {
        page_count: 2,
        blocks: [
          {
            Id: 'page-2-line',
            BlockType: 'LINE',
            Text: 'same coordinates page 2',
            Page: 2,
            Geometry: {
              BoundingBox: { Left: 0.2, Top: 0.55, Width: 0.2, Height: 0.05 },
            },
          },
          {
            Id: 'table',
            BlockType: 'TABLE',
            Page: 1,
            Geometry: {
              BoundingBox: { Left: 0.05, Top: 0.5, Width: 0.8, Height: 0.3 },
            },
            Relationships: [{ Type: 'CHILD', Ids: ['cell'] }],
          },
          {
            Id: 'cell',
            BlockType: 'CELL',
            RowIndex: 1,
            ColumnIndex: 1,
            Relationships: [{ Type: 'CHILD', Ids: ['word'] }],
          },
          { Id: 'word', BlockType: 'WORD', Text: 'page 1 cell' },
        ],
      },
    });

    expect(parsed.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'text',
          role: 'line',
          text: 'same coordinates page 2',
        }),
        expect.objectContaining({
          kind: 'table',
          html: '<table><tr><td>page 1 cell</td></tr></table>',
        }),
      ])
    );
  });

  test('reconstructs table HTML with rowspan and colspan', () => {
    const parsed = mapAwsTextractToParsedDocument({
      documentId: 'doc',
      response: {
        page_count: 1,
        blocks: [
          {
            Id: 'table',
            BlockType: 'TABLE',
            Page: 1,
            Geometry: {
              BoundingBox: { Left: 0.1, Top: 0.1, Width: 0.8, Height: 0.5 },
            },
            Relationships: [{ Type: 'CHILD', Ids: ['cell-1', 'cell-2'] }],
          },
          {
            Id: 'cell-1',
            BlockType: 'CELL',
            RowIndex: 1,
            ColumnIndex: 1,
            RowSpan: 2,
            Relationships: [{ Type: 'CHILD', Ids: ['word-1'] }],
          },
          {
            Id: 'cell-2',
            BlockType: 'CELL',
            RowIndex: 1,
            ColumnIndex: 2,
            ColumnSpan: 2,
            Relationships: [{ Type: 'CHILD', Ids: ['word-2'] }],
          },
          { Id: 'word-1', BlockType: 'WORD', Text: 'A&B' },
          { Id: 'word-2', BlockType: 'WORD', Text: 'wide' },
        ],
      },
    });

    expect(parsed.elements.find((element) => element.kind === 'table')).toMatchObject({
      html: '<table><tr><td rowspan="2">A&amp;B</td><td colspan="2">wide</td></tr></table>',
    });
  });

  test('represents merged cells without overlapping their constituent cells', () => {
    const parsed = mapAwsTextractToParsedDocument({
      documentId: 'doc-merged',
      response: {
        page_count: 1,
        blocks: [
          {
            Id: 'table',
            BlockType: 'TABLE',
            Page: 1,
            Relationships: [
              { Type: 'CHILD', Ids: ['cell-a', 'cell-b'] },
              { Type: 'MERGED_CELL', Ids: ['merged'] },
            ],
          },
          {
            Id: 'cell-a',
            BlockType: 'CELL',
            RowIndex: 1,
            ColumnIndex: 1,
            Relationships: [{ Type: 'CHILD', Ids: ['word-a'] }],
          },
          {
            Id: 'cell-b',
            BlockType: 'CELL',
            RowIndex: 1,
            ColumnIndex: 2,
            Relationships: [{ Type: 'CHILD', Ids: ['word-b'] }],
          },
          {
            Id: 'merged',
            BlockType: 'MERGED_CELL',
            RowIndex: 1,
            ColumnIndex: 1,
            ColumnSpan: 2,
            Relationships: [{ Type: 'CHILD', Ids: ['cell-a', 'cell-b'] }],
          },
          { Id: 'word-a', BlockType: 'WORD', Text: 'A' },
          { Id: 'word-b', BlockType: 'WORD', Text: 'B' },
        ],
      },
    });

    const table = parsed.elements.find((element) => element.kind === 'table');
    expect(table).toMatchObject({
      kind: 'table',
      cells: [
        {
          source: { native_type: 'MERGED_CELL' },
          text: 'A B',
          column_span: 2,
          element_ids: ['aws-word-a', 'aws-word-b'],
        },
      ],
    });
    expect(ParsedDocumentSchema.safeParse(parsed).success).toBe(true);
  });

  test('keeps Textract layout order and maps figure and table footer semantics', () => {
    const geometry = (top: number) => ({
      BoundingBox: { Left: 0.1, Top: top, Width: 0.4, Height: 0.05 },
    });
    const parsed = mapAwsTextractToParsedDocument({
      documentId: 'doc-layout',
      response: {
        page_count: 1,
        blocks: [
          {
            Id: 'layout-first',
            BlockType: 'LAYOUT_TEXT',
            Page: 1,
            Geometry: geometry(0.8),
          },
          {
            Id: 'layout-second',
            BlockType: 'LAYOUT_FIGURE',
            Page: 1,
            Geometry: geometry(0.1),
          },
          {
            Id: 'table',
            BlockType: 'TABLE',
            Page: 1,
            Relationships: [{ Type: 'TABLE_FOOTER', Ids: ['footer'] }],
          },
          {
            Id: 'footer',
            BlockType: 'TABLE_FOOTER',
            Page: 1,
            Relationships: [{ Type: 'CHILD', Ids: ['footer-word'] }],
          },
          { Id: 'footer-word', BlockType: 'WORD', Text: 'Source' },
        ],
      },
    });

    expect(parsed.pages[0]?.reading_order).toEqual(['aws-layout-first', 'aws-layout-second']);
    expect(parsed.elements.find((element) => element.id === 'aws-layout-second')).toMatchObject({
      kind: 'figure',
    });
    expect(parsed.relations).toContainEqual({
      type: 'footnote_of',
      from_id: 'aws-footer',
      to_id: 'aws-table',
    });
  });

  test('maps forms, query answers, and signatures into canonical regions', () => {
    const geometry = (top: number) => ({
      BoundingBox: { Left: 0.1, Top: top, Width: 0.4, Height: 0.05 },
    });
    const parsed = mapAwsTextractToParsedDocument({
      documentId: 'doc-features',
      response: {
        page_count: 1,
        blocks: [
          {
            Id: 'key',
            BlockType: 'KEY_VALUE_SET',
            EntityTypes: ['KEY'],
            Page: 1,
            Geometry: geometry(0.1),
            Relationships: [
              { Type: 'CHILD', Ids: ['key-word'] },
              { Type: 'VALUE', Ids: ['value'] },
            ],
          },
          { Id: 'key-word', BlockType: 'WORD', Text: 'Customer' },
          {
            Id: 'value',
            BlockType: 'KEY_VALUE_SET',
            EntityTypes: ['VALUE'],
            Relationships: [{ Type: 'CHILD', Ids: ['value-word'] }],
          },
          { Id: 'value-word', BlockType: 'WORD', Text: 'Acme' },
          {
            Id: 'query',
            BlockType: 'QUERY',
            Query: { Text: 'What is the total?' },
            Relationships: [{ Type: 'ANSWER', Ids: ['answer'] }],
          },
          {
            Id: 'answer',
            BlockType: 'QUERY_RESULT',
            Text: '$42',
            Page: 1,
            Confidence: 98,
            Geometry: geometry(0.2),
          },
          {
            Id: 'signature',
            BlockType: 'SIGNATURE',
            Page: 1,
            Geometry: geometry(0.3),
          },
        ],
      },
    });

    expect(parsed.elements.map((element) => element.kind)).toEqual(
      expect.arrayContaining(['key_value', 'query_answer', 'signature'])
    );
    expect(parsed.markdown).toContain('**Customer:** Acme');
    expect(parsed.markdown).toContain('**What is the total?:** $42');
    expect(parsed.markdown).toContain('[Signature]');
    expect(ParsedDocumentSchema.safeParse(parsed).success).toBe(true);
  });
});
