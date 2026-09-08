import { describe, expect, test } from 'bun:test';
import {
  alignFieldToSourceTexts,
  alignValueToSourceText,
  documentPlainText,
} from './alignment-confidence';

describe('alignValueToSourceText', () => {
  const text =
    'The Lessor agrees to lease to the Lessee the following described 2448 square feet located at 80369 Efnen Burg, State of California.';

  test('full field value present verbatim yields exact alignment', () => {
    const result = alignValueToSourceText('80369 Efnen Burg, State of California', text);
    expect(result.status).toBe('match_exact');
    expect(result.score).toBe(0.94);
  });

  test('verbatim token match yields exact alignment', () => {
    const result = alignValueToSourceText('2448', text);
    expect(result.status).toBe('match_exact');
    expect(result.score).toBe(0.94);
  });

  test('token coverage handles bracketed OCR gaps in cited regions', () => {
    const region = 'located at 80369 Efnen Burg [street address], State of California';
    const result = alignValueToSourceText('80369 Efnen Burg, State of California', region);
    expect(result.status).toBe('match_exact');
    expect(result.score).toBeGreaterThan(0.8);
  });

  test('missing value yields ungrounded alignment', () => {
    const result = alignValueToSourceText('Not in document', text);
    expect(result.status).toBe('ungrounded');
    expect(result.score).toBe(0.35);
  });
});

describe('alignFieldToSourceTexts', () => {
  const clause = 'Signed on MAY 30, 2024 by the Lessee. Total 1,250.00 USD.';
  // A field that cites the clause it was read from, which is also the whole
  // document here — so these cases do not depend on which one answered.
  const texts = { citedTexts: [clause], documentText: clause };

  test('a value found in the text keeps its own alignment and stores no quote', () => {
    const result = alignFieldToSourceTexts({
      value: 'MAY 30, 2024',
      quote: 'MAY 30, 2024',
      ...texts,
    });
    expect(result.status).toBe('match_exact');
    expect(result.quote).toBeUndefined();
  });

  test('a reformatted value is derived from a quote that is present verbatim', () => {
    const result = alignFieldToSourceTexts({
      value: '2024-05-30',
      quote: 'MAY 30, 2024',
      ...texts,
    });
    // The status and score describe the text that was read, which matched
    // verbatim. The rewrite that followed is a separate claim, and lineage gives
    // it a separate edge to be doubted on.
    expect(result.status).toBe('match_exact');
    expect(result.quote).toBe('MAY 30, 2024');
    expect(result.score).toBe(0.94);
  });

  test('an invented quote is discarded rather than kept as derived evidence', () => {
    const result = alignFieldToSourceTexts({
      value: '2029-01-01',
      quote: 'Signed on JANUARY 1, 2029',
      ...texts,
    });
    expect(result.status).toBe('ungrounded');
    expect(result.score).toBe(0.35);
    expect(result.quote).toBeUndefined();
  });

  test('a missing quote never fails a field, it just stays ungrounded', () => {
    const result = alignFieldToSourceTexts({ value: '2029-01-01', ...texts });
    expect(result.status).toBe('ungrounded');
    expect(result.quote).toBeUndefined();
  });

  test('a reformatted value is derived from its citation, not from a coincidence elsewhere', () => {
    // The commencement clause spells the date out; an unrelated line happens to
    // carry the same ISO string. Matching that line would call the field exactly
    // grounded in a passage it was never read from, and drop the quote pointing
    // at the passage it was.
    const result = alignFieldToSourceTexts({
      value: '2025-05-20',
      quote: 'the 20 day of May 2025',
      citedTexts: ['The term commences on the 20 day of May 2025.'],
      documentText:
        'This Lease Agreement made the 2025-05-20. The term commences on the 20 day of May 2025.',
    });
    expect(result.status).toBe('match_exact');
    expect(result.quote).toBe('the 20 day of May 2025');
  });

  test('a value found outside the regions it cites is fuzzy, never exact', () => {
    const result = alignFieldToSourceTexts({
      value: '2025-05-20',
      citedTexts: ['The term commences on the 20 day of May 2025.'],
      documentText:
        'This Lease Agreement made the 2025-05-20. The term commences on the 20 day of May 2025.',
    });
    expect(result.status).toBe('match_fuzzy');
  });

  test('a field that cites nothing is still judged against the whole document', () => {
    const result = alignFieldToSourceTexts({
      value: '2025-05-20',
      citedTexts: [],
      documentText: 'This Lease Agreement made the 2025-05-20.',
    });
    expect(result.status).toBe('match_exact');
  });

  test('a reformat that still resembles its source is a rewrite, not a direct read', () => {
    // Currency and separators normalise away, so this value aligns loosely
    // against the very text it was rewritten from. Judging it on that alignment
    // would present a rewrite as text read off the page as written.
    const result = alignFieldToSourceTexts({
      value: 1234.5,
      quote: '$1,234.50',
      citedTexts: ['Amount due $1,234.50'],
      documentText: 'Amount due $1,234.50',
    });
    expect(result.status).toBe('match_exact');
    expect(result.quote).toBe('$1,234.50');
  });

  test('a quote found only outside the cited regions grounds nothing', () => {
    // A read is attributed to the regions the field cites. Text found elsewhere
    // cannot be a verified read of them at any score.
    const result = alignFieldToSourceTexts({
      value: '2024-05-30',
      quote: 'MAY 30, 2024',
      citedTexts: ['Effective as of the date set out below'],
      documentText: 'Effective as of the date set out below. Signed on MAY 30, 2024.',
    });
    expect(result.status).toBe('ungrounded');
    expect(result.quote).toBeUndefined();
  });

  test('a value with an apostrophe aligns against the escaped source listing', () => {
    const listing = '<element id="b0" type="text">Lessee: O&apos;Brien &amp; Sons</element>';
    const result = alignFieldToSourceTexts({
      value: "O'Brien & Sons",
      citedTexts: [],
      documentText: documentPlainText(listing),
    });
    expect(result.status).toBe('match_exact');
  });

  test('nothing was read into an absent value, whatever the model quoted', () => {
    for (const value of [null, '']) {
      const result = alignFieldToSourceTexts({
        value,
        quote: 'Signed on MAY 30, 2024 by the Lessee',
        ...texts,
      });
      expect(result.status).toBe('ungrounded');
      expect(result.quote).toBeUndefined();
    }
  });

  test('a quote can ground a value that carries no matchable text of its own', () => {
    const result = alignFieldToSourceTexts({
      value: true,
      quote: 'Signed on MAY 30, 2024 by the Lessee',
      ...texts,
    });
    expect(result.status).toBe('match_exact');
    expect(result.quote).toBe('Signed on MAY 30, 2024 by the Lessee');
  });
});
