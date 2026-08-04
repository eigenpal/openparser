import { ParsedDocumentSchema } from '@openparser/schema';
import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GoogleDocumentAiAdapterError,
  mapGoogleDocumentAiToParsedDocument,
  type MapGoogleDocumentAiInput,
} from './index';

const FIXTURES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/google-document-ai'
);

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('mapGoogleDocumentAiToParsedDocument golden fixtures', () => {
  const inputs = readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith('.input.json'))
    .sort();

  for (const inputName of inputs) {
    const stem = inputName.replace(/\.input\.json$/, '');
    test(stem, () => {
      const input = loadJson<MapGoogleDocumentAiInput>(join(FIXTURES_DIR, inputName));
      const actual = mapGoogleDocumentAiToParsedDocument(input);
      expect(ParsedDocumentSchema.parse(actual).document_id).toBe(input.documentId);
      expect(actual.output_format).toBe('openparser@1');
      expect(actual.pages).toHaveLength(input.response.page_count);
      expect(actual.elements.length).toBeGreaterThan(0);
    });
  }
});

describe('mapGoogleDocumentAiToParsedDocument unit cases', () => {
  test('rejects malformed OCR and layout responses', () => {
    expect(() =>
      mapGoogleDocumentAiToParsedDocument({
        documentId: 'doc',
        response: {
          processor_type: 'OCR_PROCESSOR',
          page_count: 1,
          document: { text: 'hello' },
        },
      })
    ).toThrow(GoogleDocumentAiAdapterError);

    expect(() =>
      mapGoogleDocumentAiToParsedDocument({
        documentId: 'doc',
        response: {
          processor_type: 'LAYOUT_PARSER_PROCESSOR',
          page_count: 1,
          document: { text: 'hello' },
        },
      })
    ).toThrow(GoogleDocumentAiAdapterError);

    expect(() =>
      mapGoogleDocumentAiToParsedDocument({
        documentId: 'doc',
        response: {
          processor_type: 'OCR_PROCESSOR',
          page_count: 0,
          document: { pages: [] },
        },
      })
    ).toThrow(GoogleDocumentAiAdapterError);
  });

  test('preserves OCR hierarchy, token style, quality, and page images', () => {
    const layout = {
      textAnchor: { textSegments: [{ startIndex: '0', endIndex: '1' }] },
      confidence: 0.95,
      boundingPoly: {
        vertices: [
          { x: 1, y: 1 },
          { x: 10, y: 1 },
          { x: 10, y: 10 },
          { x: 1, y: 10 },
        ],
      },
    };
    const parsed = mapGoogleDocumentAiToParsedDocument({
      documentId: 'doc-rich',
      response: {
        processor_type: 'OCR_PROCESSOR',
        page_count: 1,
        document: {
          text: 'A',
          pages: [
            {
              dimension: { width: 100, height: 100, unit: 'pixels' },
              blocks: [{ layout }],
              paragraphs: [{ layout }],
              lines: [{ layout }],
              tokens: [
                {
                  layout,
                  detectedBreak: { type: 'SPACE' },
                  styleInfo: { fontSize: 12, fontWeight: 700 },
                },
              ],
              symbols: [{ layout }],
              imageQualityScores: { qualityScore: 0.9, detectedDefects: [] },
              image: {
                content: 'YWJj',
                mimeType: 'image/jpeg',
                width: 100,
                height: 100,
              },
            },
          ],
        },
      },
    });

    expect(parsed.elements.map((element) => element.kind)).toEqual([
      'text',
      'text',
      'text',
      'text',
      'text',
    ]);
    expect(parsed.relations).toHaveLength(4);
    expect(parsed.assets[0]).toMatchObject({ kind: 'page_image', data_base64: 'YWJj' });
    expect(parsed.pages[0]?.quality?.score?.score).toBe(0.9);
    expect(ParsedDocumentSchema.safeParse(parsed).success).toBe(true);
  });

  test('OCR processor advances column indexes past row-spanned occupancy', () => {
    const cellLayout = (startIndex: number, endIndex: number) => ({
      textAnchor: {
        textSegments: [{ startIndex: String(startIndex), endIndex: String(endIndex) }],
      },
      boundingPoly: {
        vertices: [
          { x: 1, y: 1 },
          { x: 10, y: 1 },
          { x: 10, y: 10 },
          { x: 1, y: 10 },
        ],
      },
    });
    const parsed = mapGoogleDocumentAiToParsedDocument({
      documentId: 'doc-ocr-rowspan',
      response: {
        processor_type: 'OCR_PROCESSOR',
        page_count: 1,
        document: {
          text: 'MergedHeader BHeader C',
          pages: [
            {
              dimension: { width: 100, height: 100, unit: 'pixels' },
              tables: [
                {
                  headerRows: [
                    {
                      cells: [
                        {
                          rowSpan: 2,
                          colSpan: 1,
                          layout: cellLayout(0, 6),
                        },
                        {
                          rowSpan: 1,
                          colSpan: 1,
                          layout: cellLayout(6, 14),
                        },
                      ],
                    },
                    {
                      cells: [
                        {
                          rowSpan: 1,
                          colSpan: 1,
                          layout: cellLayout(14, 22),
                        },
                      ],
                    },
                  ],
                  bodyRows: [],
                },
              ],
            },
          ],
        },
      },
    });

    const table = parsed.elements.find((element) => element.kind === 'table');
    expect(table?.kind).toBe('table');
    if (table?.kind !== 'table') throw new Error('expected table');
    expect(table.cells).toEqual([
      expect.objectContaining({
        text: 'Merged',
        row_index: 0,
        column_index: 0,
        row_span: 2,
        column_span: 1,
      }),
      expect.objectContaining({
        text: 'Header B',
        row_index: 0,
        column_index: 1,
        row_span: 1,
        column_span: 1,
      }),
      expect.objectContaining({
        text: 'Header C',
        row_index: 1,
        column_index: 1,
        row_span: 1,
        column_span: 1,
      }),
    ]);
    expect(table.column_count).toBe(2);
    expect(table.row_count).toBe(2);
    expect(ParsedDocumentSchema.safeParse(parsed).success).toBe(true);
  });

  test('layout parser advances column indexes past row-spanned occupancy', () => {
    const parsed = mapGoogleDocumentAiToParsedDocument({
      documentId: 'doc-layout-rowspan',
      response: {
        processor_type: 'LAYOUT_PARSER_PROCESSOR',
        page_count: 1,
        document: {
          documentLayout: {
            blocks: [
              {
                tableBlock: {
                  headerRows: [
                    {
                      cells: [
                        {
                          rowSpan: 2,
                          colSpan: 1,
                          blocks: [{ textBlock: { text: 'Merged' } }],
                        },
                        {
                          rowSpan: 1,
                          colSpan: 1,
                          blocks: [{ textBlock: { text: 'Header B' } }],
                        },
                      ],
                    },
                    {
                      cells: [
                        {
                          rowSpan: 1,
                          colSpan: 1,
                          blocks: [{ textBlock: { text: 'Header C' } }],
                        },
                      ],
                    },
                  ],
                  bodyRows: [],
                },
              },
            ],
          },
        },
      },
    });

    const table = parsed.elements.find((element) => element.kind === 'table');
    expect(table?.kind).toBe('table');
    if (table?.kind !== 'table') throw new Error('expected table');
    expect(table.cells).toEqual([
      expect.objectContaining({
        text: 'Merged',
        row_index: 0,
        column_index: 0,
        row_span: 2,
        column_span: 1,
      }),
      expect.objectContaining({
        text: 'Header B',
        row_index: 0,
        column_index: 1,
        row_span: 1,
        column_span: 1,
      }),
      expect.objectContaining({
        text: 'Header C',
        row_index: 1,
        column_index: 1,
        row_span: 1,
        column_span: 1,
      }),
    ]);
    expect(table.column_count).toBe(2);
    expect(table.row_count).toBe(2);
    expect(ParsedDocumentSchema.safeParse(parsed).success).toBe(true);
  });

  test('derives checkbox state from Google visual element types', () => {
    const parsed = mapGoogleDocumentAiToParsedDocument({
      documentId: 'doc-checkboxes',
      response: {
        processor_type: 'OCR_PROCESSOR',
        page_count: 1,
        document: {
          text: 'checks',
          pages: [
            {
              dimension: { width: 100, height: 100, unit: 'pixels' },
              visualElements: [{ type: 'filled_checkbox' }, { type: 'unfilled_checkbox' }],
            },
          ],
        },
      },
    });

    expect(
      parsed.elements
        .filter((element) => element.kind === 'selection_mark')
        .map((element) => (element.kind === 'selection_mark' ? element.state : undefined))
    ).toEqual(['selected', 'unselected']);
  });

  test('converts TextAnchor code-point offsets to UTF-16 for non-BMP emoji', () => {
    const emoji = '😀';
    const text = `A${emoji}B`;
    expect(emoji.length).toBe(2);
    expect(Array.from(text).length).toBe(3);

    const layoutFor = (startIndex: string, endIndex: string) => ({
      textAnchor: { textSegments: [{ startIndex, endIndex }] },
      confidence: 0.9,
      boundingPoly: {
        vertices: [
          { x: 1, y: 1 },
          { x: 10, y: 1 },
          { x: 10, y: 10 },
          { x: 1, y: 10 },
        ],
      },
    });

    const parsed = mapGoogleDocumentAiToParsedDocument({
      documentId: 'doc-emoji',
      response: {
        processor_type: 'OCR_PROCESSOR',
        page_count: 1,
        document: {
          text,
          pages: [
            {
              dimension: { width: 100, height: 100, unit: 'pixels' },
              tokens: [
                { layout: layoutFor('0', '1') },
                {
                  layout: {
                    textAnchor: {
                      textSegments: [
                        { startIndex: '1', endIndex: '2' },
                        { startIndex: '2', endIndex: '3' },
                      ],
                    },
                    confidence: 0.9,
                    boundingPoly: {
                      vertices: [
                        { x: 1, y: 1 },
                        { x: 10, y: 1 },
                        { x: 10, y: 10 },
                        { x: 1, y: 10 },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    });

    const words = parsed.elements.filter(
      (element) => element.kind === 'text' && element.role === 'word'
    );
    expect(words[0]).toMatchObject({
      text: 'A',
      spans: [{ start: 0, end: 1 }],
    });
    expect(words[1]).toMatchObject({
      text: `${emoji}B`,
      spans: [
        { start: 1, end: 3 },
        { start: 3, end: 4 },
      ],
    });
    expect(parsed.text.slice(1, 3)).toBe(emoji);
    expect('text_index_unit' in parsed).toBe(false);
    expect(ParsedDocumentSchema.safeParse(parsed).success).toBe(true);
  });
});
