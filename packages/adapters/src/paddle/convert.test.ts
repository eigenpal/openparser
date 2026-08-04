import { ParsedDocumentSchema } from '@openparser/schema';
import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PaddleAdapterError,
  canonicalizeMarkdownFigureUris,
  mapLayoutResultsToParsedDocument,
  readDataInfoPages,
  resolveFigureBlockUri,
  type MapLayoutResultsInput,
} from './index';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/paddle');

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('mapLayoutResultsToParsedDocument golden fixtures', () => {
  const inputs = readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith('.input.json'))
    .sort();

  for (const inputName of inputs) {
    const stem = inputName.replace(/\.input\.json$/, '');
    test(stem, () => {
      const input = loadJson<MapLayoutResultsInput>(join(FIXTURES_DIR, inputName));
      const actual = mapLayoutResultsToParsedDocument(input);
      expect(ParsedDocumentSchema.parse(actual).document_id).toBe(input.documentId);
      expect(actual.output_format).toBe('openparser@1');
      expect(actual.pages).toHaveLength(input.pages.length);
      expect(actual.elements.length).toBeGreaterThan(0);
    });
  }
});

describe('mapLayoutResultsToParsedDocument unit cases', () => {
  test('normalizes block text, contents, and derived markdown without changing formulas', () => {
    const parsed = mapLayoutResultsToParsedDocument({
      documentId: 'doc-latex',
      pages: [{ number: 1, width: 100, height: 100 }],
      layoutResults: [
        {
          prunedResult: {
            parsing_res_list: [
              {
                block_id: 1,
                block_label: 'text',
                block_content: 'Card U R $ ^{{*}} $ Magicjack',
                block_bbox: [0, 0, 50, 10],
              },
              {
                block_id: 2,
                block_label: 'formula',
                block_content: 'See $ \\S $ 12; $^{x}$ and $E = mc^2$ remain',
                block_bbox: [0, 12, 80, 22],
              },
            ],
          },
        },
      ],
    });

    expect(parsed.elements[0]).toMatchObject({
      kind: 'text',
      text: 'Card U R* Magicjack',
    });
    expect(parsed.elements[1]).toMatchObject({
      kind: 'formula',
      value: 'See § 12; $^{x}$ and $E = mc^2$ remain',
    });
  });

  test('renders canonical markdown from normalized table cells', () => {
    const rawHtml =
      '<table title="$ ^{{*}} $"><tr><td>See $ \\S $ 12</td><td>$ \\& $amp;</td></tr></table>';
    const providerMarkdown = `Prose U R $ ^{{*}} $ Magicjack [See $ \\S $ 8](https://example.test/$ ^{{*}} $/doc)\n\n${rawHtml}`;
    const parsed = mapLayoutResultsToParsedDocument({
      documentId: 'doc-table-latex',
      pages: [{ number: 1, width: 100, height: 100 }],
      layoutResults: [
        {
          markdown: { text: providerMarkdown },
          prunedResult: {
            parsing_res_list: [
              {
                block_id: 1,
                block_label: 'table',
                block_content: rawHtml,
                block_bbox: [0, 0, 80, 40],
              },
            ],
          },
        },
      ],
    });
    const normalized =
      '<table title="$ ^{{*}} $"><tr><td>See § 12</td><td>$ \\& $amp;</td></tr></table>';

    expect(parsed.elements[0]).toMatchObject({ kind: 'table', html: normalized });
    expect(parsed.markdown).toBe(
      '<table><tr><td>See § 12</td><td>$ \\&amp; $amp;</td></tr></table>'
    );
  });

  test('preserves empty detections with geometry and no blank markdown pollution', () => {
    const parsed = mapLayoutResultsToParsedDocument({
      documentId: 'doc-empty-detections',
      pages: [{ number: 1, width: 1224, height: 1584 }],
      layoutResults: [
        {
          prunedResult: {
            width: 1224,
            height: 1584,
            parsing_res_list: [
              {
                block_id: 0,
                block_label: 'title',
                block_content: '',
                block_bbox: [100, 40, 900, 120],
                block_score: 0.88,
              },
              {
                block_id: 1,
                block_label: 'header',
                block_content: '   ',
                block_bbox: [40, 10, 200, 30],
                block_score: 0.7,
              },
              {
                block_id: 2,
                block_label: 'figure',
                block_content: '',
                block_bbox: [950, 1400, 1100, 1550],
                block_score: 0.93,
              },
              {
                block_id: 3,
                block_label: 'text',
                block_content: 'Normal paragraph',
                block_bbox: [80, 200, 700, 260],
                block_score: 0.97,
              },
              {
                block_id: 4,
                block_label: 'table',
                block_content: '<table><tr><td>cell</td></tr></table>',
                block_bbox: [80, 300, 700, 500],
                block_score: 0.95,
              },
            ],
          },
        },
      ],
    });

    expect(parsed.elements).toHaveLength(5);
    expect(parsed.markdown).toBe('Normal paragraph\n\n<table><tr><td>cell</td></tr></table>');
    expect(parsed.markdown.includes('\n\n\n')).toBe(false);
    expect(ParsedDocumentSchema.parse(parsed).elements).toHaveLength(5);
  });

  test('falls back to dataInfo.pages raster dims when prunedResult omits width/height', () => {
    const parsed = mapLayoutResultsToParsedDocument({
      documentId: 'doc-datainfo',
      pages: [{ number: 1, width: 612, height: 792 }],
      dataInfoPages: [{ number: 1, width: 1224, height: 1584 }],
      layoutResults: [
        {
          prunedResult: {
            parsing_res_list: [
              {
                block_id: 0,
                block_label: 'header',
                block_content: 'Edge',
                block_bbox: [1100, 20, 1200, 60],
              },
            ],
          },
        },
      ],
    });

    expect(parsed.pages[0]).toMatchObject({ width: 1224, height: 1584, unit: 'pixel' });
    expect(parsed.elements[0]?.locations[0]).toMatchObject({
      bbox: { left: 1100, top: 20, right: 1200, bottom: 60 },
    });
  });

  test('rejects page count mismatch', () => {
    expect(() =>
      mapLayoutResultsToParsedDocument({
        documentId: 'doc-mismatch',
        pages: [{ number: 1, width: 10, height: 10 }],
        layoutResults: [],
      })
    ).toThrow(PaddleAdapterError);
  });
});

describe('figure URI helpers', () => {
  const openParserFigureUriValidator = (uri: string) =>
    /^\/files\/(?:opfig|ocrfig)_[a-f0-9]{32}\/content$/.test(uri);

  test('none strips unresolved markdown image references', () => {
    expect(
      canonicalizeMarkdownFigureUris({
        markdown: 'before ![crop](imgs/a.jpg) <img src="https://example.com/a.png"> after',
        figureAssets: 'none',
        uriMap: new Map(),
      })
    ).toBe('before   after');
  });

  test('stored without validator accepts arbitrary mapped public URIs', () => {
    const uriMap = new Map([['imgs/a.jpg', 'https://cdn.example.test/figures/a.jpg']]);
    expect(
      resolveFigureBlockUri({
        blockContent: 'imgs/a.jpg',
        figureAssets: 'stored',
        uriMap,
      })
    ).toBe('https://cdn.example.test/figures/a.jpg');
    expect(
      canonicalizeMarkdownFigureUris({
        markdown: '![figure](imgs/a.jpg)',
        figureAssets: 'stored',
        uriMap,
      })
    ).toBe('![figure](https://cdn.example.test/figures/a.jpg)');
    expect(
      canonicalizeMarkdownFigureUris({
        markdown: '![external](https://example.com/arbitrary.png)',
        figureAssets: 'stored',
        uriMap: new Map(),
      })
    ).toBe('![external](https://example.com/arbitrary.png)');
  });

  test('stored with validator rejects external and unmapped figure references', () => {
    expect(
      resolveFigureBlockUri({
        blockContent: 'https://example.com/arbitrary.png',
        figureAssets: 'stored',
        uriMap: new Map(),
      })
    ).toBeNull();
    expect(() =>
      canonicalizeMarkdownFigureUris({
        markdown: '![external](https://example.com/arbitrary.png)',
        figureAssets: 'stored',
        uriMap: new Map(),
        isPublicFigureUri: openParserFigureUriValidator,
      })
    ).toThrow(PaddleAdapterError);
  });

  test('stored resolves mapped provider paths when validator accepts them', () => {
    const publicUri = '/files/opfig_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/content';
    const uriMap = new Map([['imgs/a.jpg', publicUri]]);
    expect(
      resolveFigureBlockUri({
        blockContent: 'imgs/a.jpg',
        figureAssets: 'stored',
        uriMap,
      })
    ).toBe(publicUri);
    expect(
      canonicalizeMarkdownFigureUris({
        markdown: '![figure](imgs/a.jpg)',
        figureAssets: 'stored',
        uriMap,
        isPublicFigureUri: openParserFigureUriValidator,
      })
    ).toBe(`![figure](${publicUri})`);
  });

  test('mapLayoutResultsToParsedDocument stored uses host validator on figure blocks', () => {
    const publicUri = 'https://cdn.example.test/figures/a.jpg';
    const uriMap = new Map([['imgs/a.jpg', publicUri]]);
    const parsed = mapLayoutResultsToParsedDocument({
      documentId: 'doc',
      pages: [{ number: 1, width: 100, height: 100 }],
      figureAssets: 'stored',
      figureUriMap: uriMap,
      layoutResults: [
        {
          prunedResult: {
            parsing_res_list: [
              {
                block_id: 1,
                block_label: 'figure',
                block_content: 'imgs/a.jpg',
                block_bbox: [1, 1, 10, 10],
              },
            ],
          },
        },
      ],
    });
    expect(parsed.elements[0]).toMatchObject({
      kind: 'figure',
      asset_id: 'doc-paddle-1-1-asset',
    });
    expect(parsed.assets[0]).toMatchObject({ uri: publicUri });
    expect(() =>
      mapLayoutResultsToParsedDocument({
        documentId: 'doc',
        pages: [{ number: 1, width: 100, height: 100 }],
        figureAssets: 'stored',
        figureUriMap: uriMap,
        isPublicFigureUri: openParserFigureUriValidator,
        layoutResults: [
          {
            prunedResult: {
              parsing_res_list: [
                {
                  block_id: 1,
                  block_label: 'figure',
                  block_content: 'imgs/a.jpg',
                  block_bbox: [1, 1, 10, 10],
                },
              ],
            },
          },
        ],
      })
    ).toThrow(PaddleAdapterError);
  });
});

describe('readDataInfoPages', () => {
  test('reads raster dims from HPS result.dataInfo.pages', () => {
    expect(
      readDataInfoPages({
        dataInfo: { pages: [{ width: 1224, height: 1584 }, { width: 'bad' }] },
      })
    ).toEqual([{ number: 1, width: 1224, height: 1584 }, undefined]);
  });
});
