import { expect, test } from 'bun:test';
import {
  DEFAULT_HOSTED_OCR_MODEL_ID,
  HOSTED_OCR_MODEL_CATALOG_SUMMARY,
  HOSTED_OCR_MODEL_IDS,
  hostedParseRequest,
} from '../src/hosted-models.gen';

test('hosted model catalog summary covers every known id', () => {
  expect(DEFAULT_HOSTED_OCR_MODEL_ID).toBe('paddleocr-vl-1.6');
  expect(Object.keys(HOSTED_OCR_MODEL_CATALOG_SUMMARY).length).toBe(HOSTED_OCR_MODEL_IDS.length);
  for (const id of HOSTED_OCR_MODEL_IDS) {
    expect(HOSTED_OCR_MODEL_CATALOG_SUMMARY[id]).toBeDefined();
  }
  expect(HOSTED_OCR_MODEL_CATALOG_SUMMARY['paddleocr-vl-1.6'].capabilities.markdown).toBe(true);
  expect(HOSTED_OCR_MODEL_CATALOG_SUMMARY['mistral-ocr-3'].capabilities.regions).toBe(false);
  expect(HOSTED_OCR_MODEL_CATALOG_SUMMARY['paddleocr-vl-1.6'].converter.elementKinds).toContain(
    'table'
  );
});

test('hostedParseRequest preserves payloads and open-model escape hatch', () => {
  const known = hostedParseRequest({
    ocr_model: 'paddleocr-vl-1.6',
    ocr_options: { image_block_ocr: true },
    output_format: 'openparser@1',
  });
  expect(known).toEqual({
    ocr_model: 'paddleocr-vl-1.6',
    ocr_options: { image_block_ocr: true },
    output_format: 'openparser@1',
  });

  const open = hostedParseRequest({
    ocr_model: 'future-vendor-model',
    ocr_options: { experimental_flag: true, nested: { ok: 1 } },
  });
  expect(open.ocr_model).toBe('future-vendor-model');
  expect(open.ocr_options).toEqual({ experimental_flag: true, nested: { ok: 1 } });

  hostedParseRequest({
    ocr_model: 'paddleocr-vl-1.6',
    ocr_options: {
      // @ts-expect-error unknown option key is rejected for a known hosted model
      not_a_real_option: true,
    },
  });
});
