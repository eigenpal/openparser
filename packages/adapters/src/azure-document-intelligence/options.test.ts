import { describe, expect, test } from 'bun:test';
import { AzureDiError } from './errors';
import { resolveAzureDiAnalyzeParams } from './options';

describe('resolveAzureDiAnalyzeParams', () => {
  test('omitted options preserve defaults (no features/locale/pages)', () => {
    expect(resolveAzureDiAnalyzeParams({ documentPageCount: 3 })).toEqual({
      expectedPageCount: 3,
    });
    expect(
      resolveAzureDiAnalyzeParams({
        documentPageCount: 1,
        options: { locale: null, pages: null },
      })
    ).toEqual({ expectedPageCount: 1 });
  });

  test('maps true booleans to exact REST feature values in stable order', () => {
    const resolved = resolveAzureDiAnalyzeParams({
      documentPageCount: 4,
      options: {
        key_value_pairs: true,
        languages: true,
        barcodes: true,
        font_styles: true,
        formulas: true,
        high_resolution_ocr: true,
      },
    });
    expect(resolved.features).toBe(
      'ocrHighResolution,formulas,styleFont,barcodes,languages,keyValuePairs'
    );
    expect(resolved.expectedPageCount).toBe(4);
  });

  test('accepts locale and pages overrides', () => {
    expect(
      resolveAzureDiAnalyzeParams({
        documentPageCount: 5,
        options: {
          locale: 'en-US',
          pages: '1-2,5',
          barcodes: true,
        },
      })
    ).toEqual({
      features: 'barcodes',
      locale: 'en-US',
      pages: '1-2,5',
      expectedPageCount: 3,
    });
  });

  test('rejects invalid locale and pages values conservatively', () => {
    expect(() =>
      resolveAzureDiAnalyzeParams({
        documentPageCount: 1,
        options: { locale: 'EN' },
      })
    ).toThrow(AzureDiError);
    expect(() =>
      resolveAzureDiAnalyzeParams({
        documentPageCount: 5,
        options: { pages: 'abc' },
      })
    ).toThrow(AzureDiError);
  });

  test('rejects pages beyond document page count', () => {
    expect(() =>
      resolveAzureDiAnalyzeParams({
        documentPageCount: 2,
        options: { pages: '1-3' },
      })
    ).toThrow(/exceeds document page count 2/);
  });
});
