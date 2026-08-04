import { ParsedDocumentSchema } from '@openparser/schema';
import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MistralAdapterError,
  mapMistralOcrResponseToParsedDocument,
  type MapMistralOcrResponseInput,
} from './index';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/mistral');

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('mapMistralOcrResponseToParsedDocument golden fixtures', () => {
  const inputs = readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith('.input.json'))
    .sort();

  for (const inputName of inputs) {
    const stem = inputName.replace(/\.input\.json$/, '');
    test(stem, () => {
      const input = loadJson<MapMistralOcrResponseInput>(join(FIXTURES_DIR, inputName));
      const actual = mapMistralOcrResponseToParsedDocument(input);
      expect(ParsedDocumentSchema.parse(actual).document_id).toBe(input.documentId);
      expect(actual.output_format).toBe('openparser@1');
      expect(actual.pages).toHaveLength(input.expectedPages);
      expect(actual.elements.length).toBeGreaterThan(0);

      if (stem === 'page-header') {
        expect(actual.markdown).toBe(input.payload.pages[0]!.markdown);
        expect(actual.elements).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              kind: 'text',
              role: 'page_header',
              text: 'Strana 2 z 12',
              spans: [],
            }),
          ])
        );
        expect(
          actual.elements.some((element) => element.kind === 'text' && element.role === 'header')
        ).toBe(false);
      }

      if (stem === 'page-footer') {
        expect(actual.markdown).toBe(input.payload.pages[0]!.markdown);
        expect(actual.elements).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              kind: 'text',
              role: 'page_footer',
              text: 'Strana 1 z 12',
              spans: [],
            }),
          ])
        );
        expect(
          actual.elements.some((element) => element.kind === 'text' && element.role === 'footer')
        ).toBe(false);
      }

      if (stem === 'page-confidence') {
        expect(actual.pages[0]?.confidence).toMatchObject({
          score: 0.9946072918056322,
          scope: 'recognition',
          calibrated: false,
          source_value: 0.9946072918056322,
          source_scale: 'zero_to_one',
        });
        expect(actual.pages[0]?.quality).toMatchObject({
          metrics: [{ name: 'minimum_word_confidence', value: 0.244743602691645 }],
        });
        expect(actual.pages[0]?.quality?.score).toBeUndefined();
      }

      if (stem === 'ocr4-footer-block-page-confidence') {
        const footer = actual.elements.find(
          (element) => element.kind === 'text' && element.role === 'page_footer'
        );
        expect(footer).toMatchObject({
          kind: 'text',
          role: 'page_footer',
          text: 'Strana 1 z 12',
          source: { native_type: 'layout_block', native_label: 'footer' },
        });
        expect(actual.pages[0]?.confidence?.score).toBeCloseTo(0.9871948773987812);
      }
    });
  }
});

describe('mapMistralOcrResponseToParsedDocument unit cases', () => {
  test('rejects invalid page counts and empty markdown', () => {
    expect(() =>
      mapMistralOcrResponseToParsedDocument({
        documentId: 'doc',
        expectedPages: 2,
        payload: { pages: [{ markdown: 'one page only' }] },
      })
    ).toThrow(MistralAdapterError);

    expect(() =>
      mapMistralOcrResponseToParsedDocument({
        documentId: 'doc',
        expectedPages: 1,
        payload: { pages: [{ index: 0 }] },
      })
    ).toThrow(MistralAdapterError);

    expect(() =>
      mapMistralOcrResponseToParsedDocument({
        documentId: 'doc',
        expectedPages: 1,
        payload: { pages: [{ markdown: '   ' }] },
      })
    ).toThrow(MistralAdapterError);
  });

  test('falls back to full-page region when blocks are missing', () => {
    const parsed = mapMistralOcrResponseToParsedDocument({
      documentId: 'doc',
      expectedPages: 1,
      payload: {
        pages: [
          {
            markdown: '# OCR3 report',
            dimensions: { width: 1000, height: 1200 },
          },
        ],
      },
    });

    // Preserve native page markdown; plain text + graph still derive from stripped content.
    expect(parsed.markdown).toBe('# OCR3 report');
    expect(parsed.text).toBe('OCR3 report');
    expect(parsed.elements).toHaveLength(1);
    expect(parsed.elements[0]).toMatchObject({
      kind: 'text',
      text: 'OCR3 report',
    });
    expect(parsed.pages[0]).toMatchObject({ width: 1000, height: 1200, unit: 'pixel' });
    expect('text_index_unit' in parsed).toBe(false);
  });

  test('uses plain text without table placeholders and avoids false word spans', () => {
    const tableContent = '<table><tr><td>same</td></tr></table>';
    const nativeText = '[table-a.html](table-a.html)\n[table-b.html](table-b.html)\nafter';
    const parsed = mapMistralOcrResponseToParsedDocument({
      documentId: 'doc',
      expectedPages: 1,
      payload: {
        pages: [
          {
            markdown: nativeText,
            blocks: [
              { type: 'table', content: tableContent },
              { type: 'table', content: tableContent },
            ],
            tables: [
              {
                id: 'table-a.html',
                content: tableContent,
                confidence_scores: {
                  word_confidence_scores: [{ text: 'first', start_index: 0, confidence: 0.8 }],
                },
              },
              {
                id: 'table-b.html',
                content: tableContent,
                confidence_scores: {
                  word_confidence_scores: [{ text: 'second', start_index: 0, confidence: 0.7 }],
                },
              },
            ],
            confidence_scores: {
              word_confidence_scores: [
                { text: 'after', start_index: nativeText.indexOf('after'), confidence: 0.9 },
                { text: 'same', start_index: 0, confidence: 0.5 },
              ],
            },
          },
        ],
      },
    });

    expect(parsed.text).not.toContain('table-a.html');
    expect(parsed.text).not.toContain('table-b.html');
    expect(parsed.text).not.toMatch(/\[[^\]]+\]\([^)]+\)/);
    expect(parsed.text).toContain('after');
    expect(parsed.text).toContain('same');
    expect(parsed.markdown).toContain('<table>');
    expect('text_index_unit' in parsed).toBe(false);
    // Typed table blocks claimed both natives — do not emit duplicate unclaimed tables.
    expect(parsed.elements.filter((element) => element.kind === 'table')).toHaveLength(2);

    const pageWords = parsed.elements.filter(
      (element) => element.source?.native_type === 'word_confidence'
    );
    const afterWord = pageWords.find(
      (element) => element.kind === 'text' && element.text === 'after'
    );
    const sameWord = pageWords.find(
      (element) => element.kind === 'text' && element.text === 'same'
    );
    expect(afterWord).toMatchObject({
      kind: 'text',
      text: 'after',
      spans: [{ start: parsed.text.indexOf('after'), end: parsed.text.indexOf('after') + 5 }],
    });
    // "same" appears twice in plain text after both tables expand — do not invent a span.
    expect(sameWord).toMatchObject({ kind: 'text', text: 'same', spans: [] });

    expect(
      parsed.elements.find((element) => element.id === 'mistral-1-table-0-word-0')
    ).toMatchObject({ text: 'first', confidence: { score: 0.8 }, spans: [] });
    expect(
      parsed.elements.find((element) => element.id === 'mistral-1-table-1-word-0')
    ).toMatchObject({ text: 'second', confidence: { score: 0.7 }, spans: [] });
    expect(parsed.relations).toEqual(
      expect.arrayContaining([
        {
          type: 'contains',
          from_id: 'mistral-1-block-0',
          to_id: 'mistral-1-table-0-word-0',
        },
        {
          type: 'contains',
          from_id: 'mistral-1-block-1',
          to_id: 'mistral-1-table-1-word-0',
        },
      ])
    );
    expect(ParsedDocumentSchema.safeParse(parsed).success).toBe(true);
  });

  test('OCR3-style blocks-off materializes native tables without duplicating markdown/text', () => {
    const tableA = '<table><tr><td>Alpha</td><td>1</td></tr></table>';
    const tableB = '<table><tr><td>Beta</td><td>2</td></tr></table>';
    const nativeMarkdown =
      '# Title\n\n[tbl-0.html](tbl-0.html)\n\nBody\n\n[tbl-1.html](tbl-1.html)';
    const parsed = mapMistralOcrResponseToParsedDocument({
      documentId: 'ocr3-blocks-off',
      expectedPages: 1,
      model: 'mistral-ocr-2512',
      payload: {
        pages: [
          {
            index: 0,
            markdown: nativeMarkdown,
            dimensions: { width: 800, height: 1000 },
            blocks: [],
            tables: [
              { id: 'tbl-0.html', format: 'html', content: tableA },
              { id: 'tbl-1.html', format: 'html', content: tableB },
            ],
          },
        ],
      },
    });

    expect(parsed.markdown).toBe(
      '# Title\n\n<table><tr><td>Alpha</td><td>1</td></tr></table>\n\nBody\n\n<table><tr><td>Beta</td><td>2</td></tr></table>'
    );
    expect(parsed.text).toBe('Title\n\nAlpha 1\n\nBody\n\nBeta 2');
    // Table body appears once in markdown/text (native expansion), not twice.
    expect(parsed.markdown.split('Alpha').length - 1).toBe(1);
    expect(parsed.text.split('Alpha').length - 1).toBe(1);

    const tables = parsed.elements.filter((element) => element.kind === 'table');
    expect(tables).toHaveLength(2);
    expect(tables[0]).toMatchObject({
      id: 'mistral-1-table-0',
      kind: 'table',
      html: tableA,
      source: { native_id: 'tbl-0.html', native_type: 'table' },
    });
    expect(tables[1]).toMatchObject({
      id: 'mistral-1-table-1',
      kind: 'table',
      html: tableB,
      source: { native_id: 'tbl-1.html', native_type: 'table' },
    });
    expect(tables[0]?.cells.length).toBeGreaterThan(0);
    expect(tables[1]?.cells.length).toBeGreaterThan(0);
    expect(ParsedDocumentSchema.safeParse(parsed).success).toBe(true);
  });

  test('OCR4-style blocks-off keeps identical table bodies distinct by native id', () => {
    const identical = '<table><tr><td>same</td></tr></table>';
    const nativeMarkdown = 'Intro\n[tbl-a.html](tbl-a.html)\n[tbl-b.html](tbl-b.html)\nOutro';
    const parsed = mapMistralOcrResponseToParsedDocument({
      documentId: 'ocr4-blocks-off',
      expectedPages: 1,
      model: 'mistral-ocr-4-0',
      payload: {
        pages: [
          {
            index: 0,
            markdown: nativeMarkdown,
            dimensions: { width: 1000, height: 1200 },
            // blocks omitted entirely (OCR4 blocks-off)
            tables: [
              {
                id: 'tbl-a.html',
                format: 'html',
                content: identical,
                word_confidence_scores: [{ text: 'a-word', confidence: 0.9 }],
              },
              {
                id: 'tbl-b.html',
                format: 'html',
                content: identical,
                word_confidence_scores: [{ text: 'b-word', confidence: 0.8 }],
              },
            ],
          },
        ],
      },
    });

    expect(parsed.markdown).toContain(identical);
    expect(parsed.markdown.split(identical).length - 1).toBe(2);
    expect(parsed.text.split('same').length - 1).toBe(2);

    const tables = parsed.elements.filter((element) => element.kind === 'table');
    expect(tables.map((table) => table.source?.native_id)).toEqual(['tbl-a.html', 'tbl-b.html']);
    expect(tables).toHaveLength(2);

    const bodyText = parsed.elements.find(
      (element) => element.kind === 'text' && element.source?.native_type === 'layout_block'
    );
    expect(bodyText).toMatchObject({ kind: 'text', text: 'Intro\n\nOutro' });
    expect(bodyText && 'text' in bodyText ? bodyText.text : '').not.toContain('same');

    expect(parsed.relations).toEqual(
      expect.arrayContaining([
        { type: 'contains', from_id: 'mistral-1-table-0', to_id: 'mistral-1-table-0-word-0' },
        { type: 'contains', from_id: 'mistral-1-table-1', to_id: 'mistral-1-table-1-word-0' },
      ])
    );
    expect(ParsedDocumentSchema.safeParse(parsed).success).toBe(true);
  });
});
