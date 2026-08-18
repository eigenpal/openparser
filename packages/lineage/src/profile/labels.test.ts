import { describe, expect, it } from 'bun:test';

import { activityLabel } from './labels';

describe('OpenParser activityLabel', () => {
  it('names known types, honors an explicit name, and falls back to the raw type', () => {
    expect(activityLabel({ type: 'ocr' })).toBe('Parse');
    expect(activityLabel({ type: 'extract' })).toBe('Schema-constrained extraction');
    expect(activityLabel({ type: 'transform' })).toBe('Transform');
    expect(activityLabel({ type: 'grounding_resolution' })).toBe(
      'Grounding resolution and validation'
    );
    expect(activityLabel({ type: 'review.confirm' })).toBe('Human review');
    expect(activityLabel({ type: 'ocr', name: 'Tesseract pass' })).toBe('Tesseract pass');
    expect(activityLabel({ type: 'acme.redaction' })).toBe('acme.redaction');
  });
});
