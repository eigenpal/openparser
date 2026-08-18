import { describe, expect, it } from 'bun:test';
import {
  aggregateCitedWordConfidences,
  annotateWordsWithCitation,
  citedSpanInText,
  downwardBlendCitedMinimum,
  type ScoredWord,
} from './recognition';

const LEASE_SENTENCE =
  'The Lessor agrees to lease to the Lessee the following described 2448 square feet (SF) of Industrial Space located at 80369 Efnen Burg [street address], State of California.';

/** Handwritten street name scans badly; the square footage beside it does not. */
function leaseWords(): ScoredWord[] {
  const tokens = LEASE_SENTENCE.match(/\S+/g) ?? [];
  return tokens.map((text) => ({
    text,
    confidence: text === 'Efnen' || text === 'Burg' ? 0.53 : text === '2448' ? 0.99 : 0.97,
  }));
}

describe('downwardBlendCitedMinimum', () => {
  it('never raises above the cited minimum when context is stronger', () => {
    expect(downwardBlendCitedMinimum(0.53, 0.99)).toBe(0.53);
  });

  it('lowers the score when surrounding context OCR is weaker', () => {
    expect(downwardBlendCitedMinimum(0.99, 0.5)).toBeCloseTo(0.9165, 3);
  });
});

describe('citedSpanInText', () => {
  it('takes the first candidate that appears in the text', () => {
    const span = citedSpanInText(LEASE_SENTENCE, ['2448', LEASE_SENTENCE]);
    expect(LEASE_SENTENCE.slice(span.start, span.end)).toBe('2448');
  });

  it('skips a candidate the text does not contain', () => {
    const regionText = 'Signed MAY 30, 2024 in Bratislava';
    const span = citedSpanInText(regionText, ['2024-05-30', 'MAY 30, 2024']);
    expect(regionText.slice(span.start, span.end)).toBe('MAY 30, 2024');
  });
});

describe('annotateWordsWithCitation', () => {
  it('narrows to the tokens of the extracted text inside a longer region', () => {
    const annotated = annotateWordsWithCitation(LEASE_SENTENCE, leaseWords(), {
      extractedText: '2448',
    });
    expect(annotated.filter((word) => word.cited).map((word) => word.text)).toEqual(['2448']);
  });

  it('grounds the text that was read when the model rewrote it into the value', () => {
    const regionText = 'Signed MAY 30, 2024 in Bratislava';
    const derived = annotateWordsWithCitation(
      regionText,
      [
        { text: 'Signed', confidence: 0.94 },
        { text: 'MAY', confidence: 0.91 },
        { text: '30,', confidence: 0.92 },
        { text: '2024', confidence: 0.93 },
        { text: 'in', confidence: 0.95 },
        { text: 'Bratislava', confidence: 0.9 },
      ],
      { extractedText: 'MAY 30, 2024' }
    );
    expect(derived.filter((word) => word.cited).map((word) => word.text)).toEqual([
      'MAY',
      '30,',
      '2024',
    ]);
  });

  it('falls back to words the lineage already attributes to the value', () => {
    const annotated = annotateWordsWithCitation(
      'Total due 125.00',
      [
        { id: 'w1', text: 'Total', confidence: 0.98 },
        { id: 'w2', text: '125.00', confidence: 0.64 },
      ],
      { extractedText: 'one hundred twenty five', lineageWordIds: new Set(['w2']) }
    );
    expect(annotated.map((word) => word.cited)).toEqual([false, true]);
  });
});

describe('aggregateCitedWordConfidences', () => {
  it('discounts a crisp value for bad neighbors instead of adopting their score', () => {
    const words = leaseWords();
    expect(Math.min(...words.map((word) => word.confidence))).toBe(0.53);

    const aggregate = aggregateCitedWordConfidences(
      annotateWordsWithCitation(LEASE_SENTENCE, words, { extractedText: '2448' })
    );

    expect(aggregate?.method).toBe('cited_minimum_context_downblend');
    expect(aggregate?.sampleCount).toBe(1);
    expect(aggregate?.minimum).toBe(0.99);
    expect(aggregate?.contextSampleCount).toBe(words.length - 1);
    expect(aggregate?.score).toBeGreaterThan(0.95);
    expect(aggregate?.score).toBeLessThan(0.99);
  });

  it('keeps the cited minimum when context OCR is stronger', () => {
    const aggregate = aggregateCitedWordConfidences([
      { text: 'Total', confidence: 0.98, cited: false },
      { text: '125.00', confidence: 0.64, cited: true },
    ]);
    expect(aggregate?.score).toBe(0.64);
  });

  it('scores the whole region when nothing narrowed it to a value', () => {
    const aggregate = aggregateCitedWordConfidences([
      { text: 'Efnen', confidence: 0.53, cited: false },
      { text: 'Burg', confidence: 0.53, cited: false },
      { text: '2448', confidence: 0.99, cited: false },
    ]);
    expect(aggregate?.score).toBe(0.53);
    expect(aggregate?.sampleCount).toBe(3);
    expect(aggregate?.contextMean).toBeUndefined();
  });
});
