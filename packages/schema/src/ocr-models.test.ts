import { describe, expect, test } from 'bun:test';
import { OCR_MODEL_CATALOG, getOcrModelUsdPerPage, requireOcrModelUsdPerPage } from './ocr-models';

describe('OCR_MODEL_CATALOG page pricing', () => {
  test('every catalog model has finite non-negative customer retail usd_per_page', () => {
    expect(OCR_MODEL_CATALOG.length).toBeGreaterThan(0);
    for (const entry of OCR_MODEL_CATALOG) {
      expect(Number.isFinite(entry.pricing.usd_per_page)).toBe(true);
      expect(entry.pricing.usd_per_page).toBeGreaterThanOrEqual(0);
      expect(entry.pricing.basis).toBe('customer_retail');
      expect(requireOcrModelUsdPerPage(entry.id)).toBe(entry.pricing.usd_per_page);
    }
  });

  test('unknown models have no page price', () => {
    expect(getOcrModelUsdPerPage('unknown-model')).toBeNull();
    expect(() => requireOcrModelUsdPerPage('unknown-model')).toThrow(/missing customer retail/);
  });
});
