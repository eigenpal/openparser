import type { ParsedDocument } from '@openparser/schema';
import { describe, expect, test } from 'bun:test';
import { ALIGNMENT_SCORE } from './alignment-confidence';
import {
  alignExtractionField,
  assessExtractionField,
  finalValueAlignment,
} from './field-alignment';
import { compileTransformPlan } from './schema-transform';

const document: ParsedDocument = {
  output_format: 'openparser@1',
  document_id: 'doc_align',
  provenance: { provider: 'test', model: 'test' },
  text: 'Hello',
  markdown: 'Hello',
  pages: [
    {
      number: 1,
      width: 100,
      height: 100,
      unit: 'pixel',
      rotation_degrees: 0,
      languages: [],
      element_ids: ['e0'],
      reading_order: ['e0'],
    },
  ],
  elements: [
    {
      id: 'e0',
      kind: 'text',
      role: 'paragraph',
      text: 'Hello',
      spans: [],
      languages: [],
      locations: [{ page_number: 1, bbox: { left: 1, top: 1, right: 10, bottom: 10 } }],
    },
  ],
  text_annotations: [],
  relations: [],
  assets: [],
};

const citation = {
  element_id: 'e0',
  page_number: 1,
  bbox: { left: 1, top: 1, right: 10, bottom: 10 },
  source_type: 'text' as const,
  granularity: 'element' as const,
};

const datedDocument: ParsedDocument = {
  ...document,
  document_id: 'doc_date',
  text: 'Signed May 30, 2024',
  markdown: 'Signed May 30, 2024',
  elements: [{ ...document.elements[0]!, text: 'Signed May 30, 2024' }],
};

const dateSchema = {
  type: 'object',
  properties: { signed_on: { type: 'string', format: 'date' } },
  required: ['signed_on'],
  additionalProperties: false,
};

const dateField = {
  citations: [citation],
  quote: 'May 30, 2024',
  transform_claim: {
    operation: 'date_time_format' as const,
    parameters: {},
    reason: 'The date was reformatted.',
    confidence: 'high' as const,
  },
};

describe('alignExtractionField', () => {
  test('a value present in the cited region is exact', () => {
    expect(
      alignExtractionField({
        value: 'Hello',
        field: { citations: [citation], quote: 'Hello' },
        parsedDocument: document,
      })
    ).toMatchObject({ status: 'match_exact', score: 0.94 });
  });

  test('an invented value citing a real element is ungrounded', () => {
    expect(
      alignExtractionField({
        value: 'Completely invented',
        field: { citations: [citation], quote: 'Completely invented' },
        parsedDocument: document,
      })
    ).toMatchObject({ status: 'ungrounded', score: 0.35 });
  });
});

describe('assessExtractionField', () => {
  test('a contradicted date conversion cannot inherit the quote match', () => {
    const assessment = assessExtractionField({
      value: '2024-05-31',
      field: dateField,
      parsedDocument: datedDocument,
      pointer: '/signed_on',
      transformPlan: compileTransformPlan(dateSchema),
    });
    expect(assessment.alignment).toMatchObject({
      status: 'match_exact',
      score: 0.94,
      quote: 'May 30, 2024',
    });
    expect(assessment.verification?.result).toBe('contradicted');
    expect(assessment.verification?.proof.operands).toMatchObject({
      canonical: '2024-05-30',
      output: '2024-05-31',
    });
    expect(finalValueAlignment(assessment)).toEqual({
      status: 'ungrounded',
      score: ALIGNMENT_SCORE.ungrounded,
    });
  });

  test('a verified date conversion keeps the quote match for the returned value', () => {
    const assessment = assessExtractionField({
      value: '2024-05-30',
      field: dateField,
      parsedDocument: datedDocument,
      pointer: '/signed_on',
      transformPlan: compileTransformPlan(dateSchema),
    });
    expect(assessment.verification?.result).toBe('verified');
    expect(finalValueAlignment(assessment)).toEqual({
      status: 'match_exact',
      score: 0.94,
    });
  });

  test('a rewrite without a trusted transform plan inherits exact quote alignment', () => {
    const assessment = assessExtractionField({
      value: '2024-05-30',
      field: dateField,
      parsedDocument: datedDocument,
      pointer: '/signed_on',
    });
    expect(assessment.verification).toBeUndefined();
    expect(assessment.alignment).toMatchObject({
      status: 'match_exact',
      score: 0.94,
      quote: 'May 30, 2024',
    });
    expect(finalValueAlignment(assessment)).toEqual({
      status: 'match_exact',
      score: 0.94,
    });
  });

  test('a direct read keeps exact alignment without transform verification', () => {
    const assessment = assessExtractionField({
      value: 'May 30, 2024',
      field: {
        citations: [citation],
        quote: 'May 30, 2024',
      },
      parsedDocument: datedDocument,
      pointer: '/signed_on',
      transformPlan: compileTransformPlan(dateSchema),
    });
    expect(assessment.verification).toBeUndefined();
    expect(assessment.alignment).toMatchObject({ status: 'match_exact', score: 0.94 });
    expect(assessment.alignment.quote).toBeUndefined();
    expect(finalValueAlignment(assessment)).toEqual({
      status: 'match_exact',
      score: 0.94,
    });
  });

  test('an unverifiable rewrite with a trusted plan cannot inherit quote alignment', () => {
    const ambiguousDocument: ParsedDocument = {
      ...datedDocument,
      text: 'Due 05/06/2025',
      markdown: 'Due 05/06/2025',
      elements: [{ ...datedDocument.elements[0]!, text: 'Due 05/06/2025' }],
    };
    const assessment = assessExtractionField({
      value: '2025-06-05',
      field: {
        citations: [citation],
        quote: '05/06/2025',
        transform_claim: dateField.transform_claim,
      },
      parsedDocument: ambiguousDocument,
      pointer: '/signed_on',
      transformPlan: compileTransformPlan(dateSchema),
    });
    expect(assessment.verification?.result).toBe('not_applicable');
    expect(assessment.alignment).toMatchObject({
      status: 'match_exact',
      score: 0.94,
      quote: '05/06/2025',
    });
    expect(finalValueAlignment(assessment)).toEqual({
      status: 'ungrounded',
      score: ALIGNMENT_SCORE.ungrounded,
    });
  });
});
