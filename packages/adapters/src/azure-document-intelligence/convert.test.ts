import { ParsedDocumentSchema } from '@openparser/schema';
import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AzureDocumentIntelligenceAdapterError,
  mapAzureDocumentIntelligenceToParsedDocument,
  type MapAzureDocumentIntelligenceInput,
} from './index';

const FIXTURES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/azure-document-intelligence'
);

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('mapAzureDocumentIntelligenceToParsedDocument golden fixtures', () => {
  const inputs = readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith('.input.json'))
    .sort();

  for (const inputName of inputs) {
    const stem = inputName.replace(/\.input\.json$/, '');
    test(stem, () => {
      const input = loadJson<MapAzureDocumentIntelligenceInput>(join(FIXTURES_DIR, inputName));
      const actual = mapAzureDocumentIntelligenceToParsedDocument(input);
      expect(ParsedDocumentSchema.parse(actual).document_id).toBe(input.documentId);
      expect(actual.output_format).toBe('openparser@1');
      expect(actual.pages).toHaveLength(input.pageCount);
      expect(actual.elements.length).toBeGreaterThan(0);
    });
  }
});

describe('mapAzureDocumentIntelligenceToParsedDocument unit cases', () => {
  test('rejects page count mismatch and empty analyze results', () => {
    expect(() =>
      mapAzureDocumentIntelligenceToParsedDocument({
        documentId: 'doc',
        pageCount: 2,
        analyzeResult: { pages: [{ pageNumber: 1, width: 1000, height: 1000 }] },
      })
    ).toThrow(AzureDocumentIntelligenceAdapterError);

    expect(() =>
      mapAzureDocumentIntelligenceToParsedDocument({
        documentId: 'doc',
        pageCount: 1,
        analyzeResult: { pages: [{ pageNumber: 1, width: 1000, height: 1000 }] },
      })
    ).toThrow(AzureDocumentIntelligenceAdapterError);
  });

  test('renumbers a selected page subset into contiguous OpenParser pages', () => {
    const parsed = mapAzureDocumentIntelligenceToParsedDocument({
      documentId: 'doc-subset',
      pageCount: 2,
      analyzeResult: {
        pages: [2, 5].map((pageNumber) => ({
          pageNumber,
          width: 1000,
          height: 1000,
          lines: [
            {
              content: `page ${pageNumber}`,
              polygon: [100, 100, 500, 100, 500, 150, 100, 150],
            },
          ],
        })),
      },
    });

    expect(parsed.pages.map((page) => [page.number, page.source_page_number])).toEqual([
      [1, 2],
      [2, 5],
    ]);
    expect(
      parsed.elements
        .flatMap((element) => element.locations)
        .map((location) => location.page_number)
    ).toEqual([1, 2]);
  });

  test('preserves structured fields, formulas, and range annotations', () => {
    const parsed = mapAzureDocumentIntelligenceToParsedDocument({
      documentId: 'doc-rich',
      pageCount: 1,
      analyzeResult: {
        content: 'KeyValue',
        stringIndexType: 'textElements',
        pages: [
          {
            pageNumber: 1,
            width: 10,
            height: 10,
            unit: 'inch',
            formulas: [
              {
                value: 'x^2',
                confidence: 0.9,
                polygon: [1, 1, 2, 1, 2, 2, 1, 2],
                span: { offset: 0, length: 3 },
              },
            ],
          },
        ],
        keyValuePairs: [
          {
            key: { content: 'Key', spans: [{ offset: 0, length: 3 }] },
            value: { content: 'Value', spans: [{ offset: 3, length: 5 }] },
            confidence: 0.98,
          },
        ],
        styles: [
          {
            isHandwritten: true,
            confidence: 0.8,
            spans: [{ offset: 0, length: 8 }],
          },
        ],
        languages: [
          {
            locale: 'en',
            confidence: 0.99,
            spans: [{ offset: 0, length: 8 }],
          },
        ],
      },
    });

    expect(parsed.elements.map((element) => element.kind)).toEqual(['key_value', 'formula']);
    expect(parsed.text_annotations).toHaveLength(2);
    expect('text_index_unit' in parsed).toBe(false);
    expect(ParsedDocumentSchema.safeParse(parsed).success).toBe(true);
  });

  test('converts grapheme indices to UTF-16 and preserves native styles and hierarchy', () => {
    const family = '👨‍👩‍👧‍👦';
    const parsed = mapAzureDocumentIntelligenceToParsedDocument({
      documentId: 'doc-indexed',
      pageCount: 1,
      analyzeResult: {
        content: `A${family}B`,
        stringIndexType: 'textElements',
        pages: [
          {
            pageNumber: 1,
            width: 10,
            height: 10,
            unit: 'inch',
            lines: [
              {
                spans: [{ offset: 1, length: 1 }],
                polygon: [0, 0, 5, 0, 5, 1, 0, 1],
              },
            ],
          },
        ],
        paragraphs: [
          {
            spans: [{ offset: 1, length: 2 }],
            boundingRegions: [{ pageNumber: 1, polygon: [0, 0, 5, 0, 5, 2, 0, 2] }],
          },
        ],
        keyValuePairs: [{ key: { content: 'K' }, value: { content: 'V' } }],
        sections: [{ elements: ['/keyValuePairs/0'] }],
        styles: [
          {
            similarFontFamily: 'Arial',
            fontStyle: 'italic',
            fontWeight: 'bold',
            spans: [{ offset: 1, length: 1 }],
          },
        ],
      },
    });

    const paragraph = parsed.elements.find(
      (element) => element.source?.native_type === 'paragraph'
    );
    const line = parsed.elements.find(
      (element) => element.kind === 'text' && element.role === 'line'
    );
    const keyValue = parsed.elements.find((element) => element.kind === 'key_value');
    const section = parsed.elements.find((element) => element.kind === 'section');
    expect(paragraph).toMatchObject({ kind: 'text', text: `${family}B` });
    expect(line).toMatchObject({
      kind: 'text',
      text: family,
      spans: [{ start: 1, end: 1 + family.length }],
    });
    expect(parsed.text.slice(1, 1 + family.length)).toBe(family);
    expect(parsed.relations).toContainEqual({
      type: 'contains',
      from_id: paragraph?.id,
      to_id: line?.id,
    });
    expect(parsed.relations).toContainEqual({
      type: 'contains',
      from_id: section?.id,
      to_id: keyValue?.id,
    });
    expect(parsed.text_annotations[0]?.style).toMatchObject({
      font_family: 'Arial',
      italic: true,
      bold: true,
    });
    expect(parsed.text_annotations[0]?.spans).toEqual([{ start: 1, end: 1 + family.length }]);
  });

  test('keeps utf16CodeUnit spans as identity and converts unicodeCodePoint for non-BMP', () => {
    const emoji = '😀'; // one code point, two UTF-16 units
    const content = `A${emoji}B`;
    expect(emoji.length).toBe(2);
    expect(Array.from(content).length).toBe(3);

    const utf16 = mapAzureDocumentIntelligenceToParsedDocument({
      documentId: 'doc-utf16',
      pageCount: 1,
      analyzeResult: {
        content,
        stringIndexType: 'utf16CodeUnit',
        pages: [
          {
            pageNumber: 1,
            width: 10,
            height: 10,
            lines: [
              {
                spans: [
                  { offset: 0, length: 1 },
                  { offset: 1, length: 2 },
                ],
                polygon: [0, 0, 5, 0, 5, 1, 0, 1],
              },
            ],
          },
        ],
      },
    });
    const utf16Line = utf16.elements.find(
      (element) => element.kind === 'text' && element.role === 'line'
    );
    expect(utf16Line).toMatchObject({
      text: `A${emoji}`,
      spans: [
        { start: 0, end: 1 },
        { start: 1, end: 3 },
      ],
    });
    expect(utf16.text.slice(1, 3)).toBe(emoji);
    expect('text_index_unit' in utf16).toBe(false);

    const codePoints = mapAzureDocumentIntelligenceToParsedDocument({
      documentId: 'doc-codepoints',
      pageCount: 1,
      analyzeResult: {
        content,
        stringIndexType: 'unicodeCodePoint',
        pages: [
          {
            pageNumber: 1,
            width: 10,
            height: 10,
            lines: [
              {
                spans: [{ offset: 1, length: 1 }],
                polygon: [0, 0, 5, 0, 5, 1, 0, 1],
              },
            ],
          },
        ],
      },
    });
    const codePointLine = codePoints.elements.find(
      (element) => element.kind === 'text' && element.role === 'line'
    );
    expect(codePointLine).toMatchObject({
      text: emoji,
      spans: [{ start: 1, end: 3 }],
    });
    expect(codePoints.text.slice(1, 3)).toBe(emoji);
  });

  test('large textElements fixture preserves hierarchy and geometry structure', () => {
    // Synthetic multi-page Read-like payload: exercises grapheme span indexing at
    // scale without embedding customer text. Structure regression — not a timing gate.
    const pages = 4;
    const linesPerPage = 40;
    const wordsPerLine = 8;
    const word = 'w';
    let content = '';
    const azurePages = [];
    const paragraphs = [];

    for (let page = 1; page <= pages; page++) {
      const lines = [];
      const words = [];
      for (let line = 0; line < linesPerPage; line++) {
        const lineStart = content.length;
        const lineWords = [];
        for (let wordIndex = 0; wordIndex < wordsPerLine; wordIndex++) {
          if (wordIndex > 0) content += ' ';
          const offset = content.length;
          content += word;
          words.push({
            content: word,
            confidence: 0.9,
            span: { offset, length: word.length },
            polygon: [
              wordIndex,
              line,
              wordIndex + 1,
              line,
              wordIndex + 1,
              line + 1,
              wordIndex,
              line + 1,
            ],
          });
          lineWords.push(word);
        }
        content += '\n';
        lines.push({
          content: lineWords.join(' '),
          spans: [{ offset: lineStart, length: lineWords.join(' ').length }],
          polygon: [0, line, wordsPerLine, line, wordsPerLine, line + 1, 0, line + 1],
        });
        paragraphs.push({
          content: lineWords.join(' '),
          spans: [{ offset: lineStart, length: lineWords.join(' ').length }],
          boundingRegions: [
            {
              pageNumber: page,
              polygon: [0, line, wordsPerLine, line, wordsPerLine, line + 1, 0, line + 1],
            },
          ],
        });
      }
      azurePages.push({
        pageNumber: page,
        width: 10,
        height: linesPerPage + 1,
        unit: 'inch',
        lines,
        words,
      });
    }

    const expectedWords = pages * linesPerPage * wordsPerLine;
    const expectedLines = pages * linesPerPage;
    const parsed = mapAzureDocumentIntelligenceToParsedDocument({
      documentId: 'doc-large-structure',
      pageCount: pages,
      analyzeResult: {
        content,
        stringIndexType: 'textElements',
        pages: azurePages,
        paragraphs,
        styles: [
          {
            similarFontFamily: 'SyntheticSans',
            spans: [{ offset: 0, length: Math.min(8, content.length) }],
          },
        ],
      },
    });

    const roleCounts = {
      paragraph: 0,
      line: 0,
      word: 0,
    };
    let polygonCount = 0;
    let confidenceCount = 0;
    for (const element of parsed.elements) {
      if (element.kind === 'text') {
        if (element.role === 'paragraph') roleCounts.paragraph++;
        if (element.role === 'line') roleCounts.line++;
        if (element.role === 'word') roleCounts.word++;
      }
      if (element.locations.some((location) => location.polygon)) polygonCount++;
      if (element.confidence) confidenceCount++;
    }

    expect(parsed.pages).toHaveLength(pages);
    expect(roleCounts).toEqual({
      paragraph: expectedLines,
      line: expectedLines,
      word: expectedWords,
    });
    expect(confidenceCount).toBe(expectedWords);
    expect(polygonCount).toBeGreaterThan(expectedWords);
    expect(parsed.relations.filter((relation) => relation.type === 'contains').length).toBe(
      expectedWords + expectedLines
    );
    expect(parsed.text_annotations).toHaveLength(1);
    expect(parsed.pages.every((page) => page.unit === 'inch')).toBe(true);
    expect(parsed.pages.every((page) => page.element_ids.length > 0)).toBe(true);
    expect(parsed.pages.every((page) => page.reading_order.length > 0)).toBe(true);
    // Spot-check UTF-16 fidelity on a mid-document word span.
    const sampleWord = parsed.elements.find(
      (element) => element.kind === 'text' && element.role === 'word' && element.spans.length === 1
    );
    expect(sampleWord).toBeDefined();
    if (sampleWord && sampleWord.kind === 'text') {
      const span = sampleWord.spans[0]!;
      expect(parsed.text.slice(span.start, span.end)).toBe(sampleWord.text);
    }
    expect(ParsedDocumentSchema.safeParse(parsed).success).toBe(true);
  });
});
