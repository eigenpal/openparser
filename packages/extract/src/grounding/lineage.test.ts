import { entityAncestors, fieldTrace, LineageDocumentSchema } from '@openparser/lineage';
import { fieldGrounding, verifyTransform } from '@openparser/lineage/openparser';
import type { ParsedDocument } from '@openparser/schema';
import { describe, expect, test } from 'bun:test';
import type { ExtractionGroundingResult } from '../grounding';
import { buildExtractionLineage } from './lineage';
import { appendExtractionReviewLineage } from './review-lineage';
import { compileTransformPlan, GroundingUnsupportedSchemaError } from './schema-transform';

const document: ParsedDocument = {
  output_format: 'openparser@1',
  document_id: 'doc-1',
  provenance: { provider: 'mistral', model: 'mistral-ocr-4-0', operation: 'ocr' },
  text: 'Total 125.00',
  markdown: 'Total 125.00',
  pages: [
    {
      number: 1,
      source_page_number: 1,
      width: 1000,
      height: 1400,
      unit: 'pixel',
      rotation_degrees: 0,
      languages: [],
      element_ids: ['block-1', 'word-1', 'word-2'],
      reading_order: ['block-1'],
    },
  ],
  elements: [
    {
      id: 'block-1',
      kind: 'text',
      role: 'paragraph',
      text: 'Total 125.00',
      spans: [{ start: 0, end: 12 }],
      locations: [{ page_number: 1, bbox: { left: 100, top: 200, right: 400, bottom: 240 } }],
      languages: [],
    },
    {
      id: 'word-1',
      kind: 'text',
      role: 'word',
      text: 'Total',
      spans: [{ start: 0, end: 5 }],
      locations: [],
      languages: [],
      confidence: { score: 0.98, scope: 'recognition', calibrated: false },
    },
    {
      id: 'word-2',
      kind: 'text',
      role: 'word',
      text: '125.00',
      spans: [{ start: 6, end: 12 }],
      locations: [],
      languages: [],
      confidence: { score: 0.64, scope: 'recognition', calibrated: false },
    },
  ],
  text_annotations: [],
  relations: [
    { type: 'contains', from_id: 'block-1', to_id: 'word-1' },
    { type: 'contains', from_id: 'block-1', to_id: 'word-2' },
  ],
  assets: [],
};

const grounding: ExtractionGroundingResult = {
  mode: 'field',
  fields: [
    {
      path: 'total',
      citations: [
        {
          element_id: 'block-1',
          page_number: 1,
          bbox: { left: 100, top: 200, right: 400, bottom: 240 },
          source_type: 'text',
          granularity: 'element',
        },
      ],
    },
  ],
};

function fieldEntityId(lineage: ReturnType<typeof buildExtractionLineage>, path: string): string {
  const entry = Object.entries(lineage.entities).find(([, entity]) => entity.path === path);
  if (!entry) throw new Error(`missing lineage entity at ${path}`);
  return entry[0];
}

describe('buildExtractionLineage', () => {
  test('emits a valid OCR-to-evidence-to-value derivation DAG', () => {
    const lineage = buildExtractionLineage({
      output: { total: 125 },
      grounding,
      parsedDocument: document,
      llmModel: 'openai/gpt-5.6-terra',
    });

    expect(LineageDocumentSchema.parse(lineage).format).toBe('lineage@1');
    const totalId = fieldEntityId(lineage, '/total');
    expect(lineage.entities[totalId]).toMatchObject({
      kind: 'decision',
      path: '/total',
      value: 125,
    });
    expect(lineage.entities[totalId]?.attributes).toBeUndefined();
    // Dotted path and grounding status are derived by consumers, not stored.
    const totalTrace = fieldTrace(lineage, '/total');
    expect(totalTrace?.field.dottedPath).toBe('total');
    expect(fieldGrounding(lineage, '/total')?.status).toBe('grounded');
    expect(entityAncestors(lineage, totalId)).toEqual(
      expect.arrayContaining(['document:source', 'document:parsed', 'source-element:block-1'])
    );
    expect(
      lineage.derivations.find((entry) => entry.output === 'source-element:block-1')
    ).toMatchObject({ activity: 'activity:ocr' });
    // Model identity lives on the agent; the activity points at it via associations.
    expect(lineage.activities['activity:ocr']?.associations?.[0]?.agent).toBe('agent:ocr-model');
    expect(lineage.agents['agent:ocr-model']?.name).toBe('mistral-ocr-4-0');
    expect(lineage.agents['agent:extraction-model']?.name).toBe('openai/gpt-5.6-terra');
  });

  test('a value read as written carries the read reason on the entity the read produced', () => {
    const lineage = buildExtractionLineage({
      output: { total: 125 },
      grounding: {
        mode: 'field',
        fields: [
          {
            ...grounding.fields[0]!,
            reason: '  The cited line states Total 125.00.  ',
          },
        ],
      },
      parsedDocument: document,
      llmModel: 'openai/gpt-5.6-terra',
    });

    const totalId = fieldEntityId(lineage, '/total');
    expect(lineage.entities[totalId]?.attributes).toEqual({
      'openparser:justification': 'The cited line states Total 125.00.',
    });
    expect(
      lineage.entities['source-element:block-1']?.attributes?.['openparser:justification']
    ).toBe(undefined);
  });

  test('a rewritten value splits the two reasons across the two steps that made them', () => {
    const datedDocument: ParsedDocument = {
      ...document,
      text: 'Signed May 30, 2024',
      markdown: 'Signed May 30, 2024',
      pages: [{ ...document.pages[0]!, element_ids: ['block-1'], reading_order: ['block-1'] }],
      elements: [
        {
          id: 'block-1',
          kind: 'text',
          role: 'paragraph',
          text: 'Signed May 30, 2024',
          spans: [{ start: 0, end: 19 }],
          locations: [{ page_number: 1, bbox: { left: 100, top: 200, right: 400, bottom: 240 } }],
          languages: [],
        },
      ],
      relations: [],
    };
    const lineage = buildExtractionLineage({
      output: { signed_on: '2024-05-30' },
      grounding: {
        mode: 'field',
        fields: [
          {
            ...grounding.fields[0]!,
            path: 'signed_on',
            quote: 'May 30, 2024',
            reason: 'The signature block carries the signing date.',
            transform_claim: {
              operation: 'date_time_format',
              parameters: {},
              reason: 'The schema asks for an ISO date, so the quote was reformatted.',
            },
          },
        ],
      },
      parsedDocument: datedDocument,
      llmModel: 'openai/gpt-5.6-terra',
    });

    // Why that text was read sits on the text; why it became this value sits on
    // the value. Neither step is annotated with the other's account.
    expect(lineage.entities['source-text:/signed_on']?.attributes).toEqual({
      'openparser:justification': 'The signature block carries the signing date.',
    });
    expect(lineage.entities[fieldEntityId(lineage, '/signed_on')]?.attributes).toEqual({
      'openparser:justification': 'The schema asks for an ISO date, so the quote was reformatted.',
    });
  });

  test('a reformat that still resembles its source is still two steps', () => {
    // Every other rewrite case here uses a spelled-out date, which shares almost
    // nothing with its ISO form. Currency and separators are the common case: the
    // value loosely aligns against the text it was rewritten from, and reading
    // that as a direct read loses both the step and the model's account of it.
    const priced: ParsedDocument = {
      ...document,
      text: 'Amount due $1,234.50',
      markdown: 'Amount due $1,234.50',
      pages: [{ ...document.pages[0]!, element_ids: ['block-1'], reading_order: ['block-1'] }],
      elements: [
        {
          id: 'block-1',
          kind: 'text',
          role: 'paragraph',
          text: 'Amount due $1,234.50',
          spans: [{ start: 0, end: 20 }],
          locations: [{ page_number: 1, bbox: { left: 100, top: 200, right: 400, bottom: 240 } }],
          languages: [],
        },
      ],
      relations: [],
    };
    const lineage = buildExtractionLineage({
      output: { total: 1234.5 },
      grounding: {
        mode: 'field',
        fields: [
          {
            ...grounding.fields[0]!,
            path: 'total',
            quote: '$1,234.50',
            reason: 'The amount due line carries the invoice total.',
            transform_claim: {
              operation: 'numeric_format',
              parameters: {},
              reason: 'The schema asks for a number, so the currency format was dropped.',
            },
          },
        ],
      },
      parsedDocument: priced,
      llmModel: 'openai/gpt-5.6-terra',
    });

    expect(lineage.entities['source-text:/total']?.value).toBe('$1,234.50');
    expect(lineage.activities['activity:transform']).toBeDefined();
    expect(lineage.entities[fieldEntityId(lineage, '/total')]?.attributes).toEqual({
      'openparser:justification':
        'The schema asks for a number, so the currency format was dropped.',
    });
  });

  test('a rewritten field stays partial when dropped ids sit on the read step', () => {
    const priced: ParsedDocument = {
      ...document,
      text: 'Amount due $1,234.50',
      markdown: 'Amount due $1,234.50',
      pages: [{ ...document.pages[0]!, element_ids: ['block-1'], reading_order: ['block-1'] }],
      elements: [
        {
          id: 'block-1',
          kind: 'text',
          role: 'paragraph',
          text: 'Amount due $1,234.50',
          spans: [{ start: 0, end: 20 }],
          locations: [{ page_number: 1, bbox: { left: 100, top: 200, right: 400, bottom: 240 } }],
          languages: [],
        },
      ],
      relations: [],
    };
    const lineage = buildExtractionLineage({
      output: { total: 1234.5 },
      grounding: {
        mode: 'field',
        fields: [
          {
            ...grounding.fields[0]!,
            path: 'total',
            quote: '$1,234.50',
            dropped_source_ids: ['fabricated'],
          },
        ],
      },
      parsedDocument: priced,
      llmModel: 'openai/gpt-5.6-terra',
    });

    const readDerivation = lineage.derivations.find(
      (entry) => entry.output === 'source-text:/total'
    );
    expect(readDerivation?.attributes?.['openparser:droppedSourceIds']).toEqual(['fabricated']);
    expect(
      lineage.derivations.find((entry) => entry.output === fieldEntityId(lineage, '/total'))
        ?.attributes?.['openparser:droppedSourceIds']
    ).toBeUndefined();
    expect(fieldGrounding(lineage, '/total')).toEqual({
      status: 'partial',
      droppedSourceIds: ['fabricated'],
    });
  });

  test('keeps a supporting quote only when it is what grounds the value', () => {
    const datedDocument: ParsedDocument = {
      ...document,
      text: 'Signed MAY 30, 2024',
      markdown: 'Signed MAY 30, 2024',
      pages: [{ ...document.pages[0]!, element_ids: ['block-1'], reading_order: ['block-1'] }],
      elements: [
        {
          id: 'block-1',
          kind: 'text',
          role: 'paragraph',
          text: 'Signed MAY 30, 2024',
          spans: [{ start: 0, end: 19 }],
          locations: [{ page_number: 1, bbox: { left: 100, top: 200, right: 400, bottom: 240 } }],
          languages: [],
        },
      ],
      relations: [],
    };
    const lineageFor = (value: unknown, quote: string) =>
      buildExtractionLineage({
        output: { signed_on: value },
        grounding: {
          mode: 'field',
          fields: [{ ...grounding.fields[0]!, path: 'signed_on', quote }],
        },
        parsedDocument: datedDocument,
        llmModel: 'openai/gpt-5.6-terra',
      });
    const field = (lineage: ReturnType<typeof buildExtractionLineage>) =>
      lineage.entities[fieldEntityId(lineage, '/signed_on')];

    // A rewritten value keeps the span it was read from as an entity, not as an
    // attribute restating it on the field.
    const rewritten = lineageFor('2024-05-30', 'MAY 30, 2024');
    expect(field(rewritten)?.attributes).toBeUndefined();
    expect(rewritten.entities['source-text:/signed_on']?.value).toBe('MAY 30, 2024');

    // The value is already in the text, so there is nothing to rewrite and no
    // second step to record.
    const verbatim = lineageFor('MAY 30, 2024', 'MAY 30, 2024');
    expect(verbatim.entities['source-text:/signed_on']).toBeUndefined();
    expect(field(verbatim)?.confidence?.[0]?.attributes).toEqual({
      'openparser:alignmentStatus': 'match_exact',
    });

    // An invented quote earns nothing and is not stored as evidence.
    const invented = lineageFor('2029-01-01', 'Signed JANUARY 1, 2029');
    expect(invented.entities['source-text:/signed_on']).toBeUndefined();
    expect(field(invented)?.attributes).toBeUndefined();
    expect(field(invented)?.confidence?.[0]?.attributes).toEqual({
      'openparser:alignmentStatus': 'ungrounded',
    });
  });

  test('a model-scored value still records whether the text was there', () => {
    const lineage = buildExtractionLineage({
      output: { total: 999 },
      grounding: {
        mode: 'field',
        fields: [{ ...grounding.fields[0]!, quote: 'Total 999.00', confidence: 0.97 }],
      },
      parsedDocument: document,
      llmModel: 'openai/gpt-5.6-terra',
    });

    // Whether a value is in the document is a fact about the value, not about
    // where its score came from. Dropping it whenever the model volunteers a
    // number is how "this is not in the document" stops being reported at all.
    expect(lineage.entities[fieldEntityId(lineage, '/total')]?.confidence?.[0]).toMatchObject({
      score: 0.97,
      kind: 'reported',
      attributes: { 'openparser:alignmentStatus': 'ungrounded' },
    });
  });

  test('a rewritten value is read verbatim first, then transformed on its own edge', () => {
    const datedDocument: ParsedDocument = {
      ...document,
      text: 'Signed May 30, 2024',
      markdown: 'Signed May 30, 2024',
      pages: [{ ...document.pages[0]!, element_ids: ['block-1'], reading_order: ['block-1'] }],
      elements: [
        {
          id: 'block-1',
          kind: 'text',
          role: 'paragraph',
          text: 'Signed May 30, 2024',
          spans: [{ start: 0, end: 19 }],
          locations: [{ page_number: 1, bbox: { left: 100, top: 200, right: 400, bottom: 240 } }],
          languages: [],
        },
      ],
      relations: [],
    };
    const lineage = buildExtractionLineage({
      output: { signed_on: '2024-05-30' },
      grounding: {
        mode: 'field',
        fields: [
          {
            ...grounding.fields[0]!,
            path: 'signed_on',
            quote: 'May 30, 2024',
            transform_claim: {
              operation: 'date_time_format',
              parameters: {},
              reason: 'The date was reformatted.',
              confidence: 'low',
            },
          },
        ],
      },
      parsedDocument: datedDocument,
      llmModel: 'openai/gpt-5.6-terra',
      extractionSchema: {
        type: 'object',
        properties: {
          signed_on: {
            type: 'string',
            format: 'date',
            'x-openparser-transform': {
              operation: 'date_time_format',
              parameters: {
                sourceFormats: ['MMM dd, yyyy'],
                locale: 'en-US',
                zonePolicy: 'civil',
              },
            },
          },
        },
        required: ['signed_on'],
        additionalProperties: false,
      },
    });

    const fieldId = fieldEntityId(lineage, '/signed_on');
    const sourceTextId = 'source-text:/signed_on';
    const read = lineage.derivations.find((entry) => entry.output === sourceTextId);
    const transform = lineage.derivations.find((entry) => entry.output === fieldId);

    // The read is what cites the document; the transform only consumes the read.
    expect(read?.activity).toBe('activity:extract');
    expect(read?.inputs.some((input) => input.role === 'resolved_source_evidence')).toBe(true);
    expect(transform?.activity).toBe('activity:transform');
    expect(transform?.inputs).toEqual([
      { entity: sourceTextId, role: 'source_text', effect: 'direct' },
    ]);

    // The quote matched verbatim, so the read scores like any exact match. The
    // date conversion is independently provable, so it wins over the model's
    // deliberately low self-report.
    expect(lineage.entities[sourceTextId]?.confidence?.[0]).toMatchObject({
      kind: 'derived',
      method: 'source_text_alignment',
      attributes: { 'openparser:alignmentStatus': 'match_exact' },
    });
    expect(lineage.entities[fieldId]?.confidence?.[0]).toMatchObject({
      score: 1,
      kind: 'derived',
      scope: 'transformation',
      method: 'openparser.transform.date-time-format.v1',
      calibrated: false,
    });
    expect(transform?.transformation?.attributes?.['openparser:transformProof']).toMatchObject({
      methodId: 'openparser.transform.date-time-format.v1',
      result: 'verified',
      proofClass: 'safe_equivalence',
    });

    // One LLM call did both, and the graph says so rather than implying a
    // second request.
    expect(lineage.activities['activity:transform']).toMatchObject({
      type: 'transform',
      attributes: { 'openparser:implicit': true },
      associations: [{ agent: 'agent:extraction-model', role: 'model' }],
    });
  });

  test('a contradicted deterministic check does not keep model_ordinal confidence', () => {
    const datedDocument: ParsedDocument = {
      ...document,
      text: 'Signed May 30, 2024',
      markdown: 'Signed May 30, 2024',
      pages: [{ ...document.pages[0]!, element_ids: ['block-1'], reading_order: ['block-1'] }],
      elements: [
        {
          id: 'block-1',
          kind: 'text',
          role: 'paragraph',
          text: 'Signed May 30, 2024',
          spans: [{ start: 0, end: 19 }],
          locations: [{ page_number: 1, bbox: { left: 100, top: 200, right: 400, bottom: 240 } }],
          languages: [],
        },
      ],
      relations: [],
    };
    const lineage = buildExtractionLineage({
      output: { signed_on: '2024-05-31' },
      grounding: {
        mode: 'field',
        fields: [
          {
            ...grounding.fields[0]!,
            path: 'signed_on',
            quote: 'May 30, 2024',
            transform_claim: {
              operation: 'date_time_format',
              parameters: {},
              reason: 'The date was reformatted.',
              confidence: 'high',
            },
          },
        ],
      },
      parsedDocument: datedDocument,
      llmModel: 'openai/gpt-5.6-terra',
      extractionSchema: {
        type: 'object',
        properties: {
          signed_on: {
            type: 'string',
            format: 'date',
            'x-openparser-transform': {
              operation: 'date_time_format',
              parameters: {
                sourceFormats: ['MMM dd, yyyy'],
                locale: 'en-US',
                zonePolicy: 'civil',
              },
            },
          },
        },
        required: ['signed_on'],
        additionalProperties: false,
      },
    });

    const fieldId = fieldEntityId(lineage, '/signed_on');
    const transform = lineage.derivations.find((entry) => entry.output === fieldId);
    expect(transform?.transformation?.attributes?.['openparser:transformProof']).toMatchObject({
      result: 'contradicted',
      methodId: 'openparser.transform.date-time-format.v1',
    });
    expect(lineage.entities[fieldId]?.confidence).toBeUndefined();
  });

  test('format-only date intent ignores an adversarial currency claim', () => {
    const datedDocument: ParsedDocument = {
      ...document,
      text: 'Signed May 30, 2024',
      markdown: 'Signed May 30, 2024',
      pages: [{ ...document.pages[0]!, element_ids: ['block-1'], reading_order: ['block-1'] }],
      elements: [
        {
          id: 'block-1',
          kind: 'text',
          role: 'paragraph',
          text: 'Signed May 30, 2024',
          spans: [{ start: 0, end: 19 }],
          locations: [{ page_number: 1, bbox: { left: 100, top: 200, right: 400, bottom: 240 } }],
          languages: [],
        },
      ],
      relations: [],
    };
    const schema = {
      type: 'object',
      properties: { signed_on: { type: 'string', format: 'date' } },
      required: ['signed_on'],
      additionalProperties: false,
    };
    const verified = buildExtractionLineage({
      output: { signed_on: '2024-05-30' },
      grounding: {
        mode: 'field',
        fields: [
          {
            ...grounding.fields[0]!,
            path: 'signed_on',
            quote: 'May 30, 2024',
            transform_claim: {
              operation: 'date_time_format',
              parameters: { source_format: 'MMM dd, yyyy', target_format: 'yyyy' },
              reason: 'reformatted',
              confidence: 'low',
            },
          },
        ],
      },
      parsedDocument: datedDocument,
      llmModel: 'openai/gpt-5.6-terra',
      extractionSchema: schema,
    });
    const verifiedField = fieldEntityId(verified, '/signed_on');
    expect(verified.entities[verifiedField]?.confidence?.[0]).toMatchObject({
      score: 1,
      kind: 'derived',
      method: 'openparser.transform.date-time-format.v1',
    });
    const verifiedProof = verified.derivations.find((entry) => entry.output === verifiedField)
      ?.transformation?.attributes?.['openparser:transformProof'] as {
      trustedParameters?: { sourceCatalog?: unknown; sourceFormats?: string[] };
    };
    expect(verifiedProof.trustedParameters).toMatchObject({
      sourceCatalog: { id: 'openparser.transform.date-source-catalog', version: 1 },
    });
    expect(verifiedProof.trustedParameters?.sourceFormats).not.toEqual(['MMM dd, yyyy']);
    expect(verifiedProof.trustedParameters?.sourceFormats).toEqual(
      expect.arrayContaining(['MMM dd, yyyy', "d 'day of' MMMM yyyy"])
    );

    const adversarial = buildExtractionLineage({
      output: { signed_on: 'USD' },
      grounding: {
        mode: 'field',
        fields: [
          {
            ...grounding.fields[0]!,
            path: 'signed_on',
            quote: 'May 30, 2024',
            transform_claim: {
              operation: 'currency_code',
              parameters: { token: 'USD' },
              reason: 'this is currency',
              confidence: 'high',
            },
          },
        ],
      },
      parsedDocument: datedDocument,
      llmModel: 'openai/gpt-5.6-terra',
      extractionSchema: schema,
    });
    const fieldId = fieldEntityId(adversarial, '/signed_on');
    const transform = adversarial.derivations.find((entry) => entry.output === fieldId);
    expect(transform?.transformation?.attributes?.['openparser:transformProof']).toMatchObject({
      methodId: 'openparser.transform.date-time-format.v1',
      result: 'contradicted',
    });
    expect(adversarial.entities[fieldId]?.confidence).toBeUndefined();
  });

  test('format-only catalog claims cannot flip an ambiguous date to score 1', () => {
    const datedDocument: ParsedDocument = {
      ...document,
      text: 'Signed 05/06/2025',
      markdown: 'Signed 05/06/2025',
      pages: [{ ...document.pages[0]!, element_ids: ['block-1'], reading_order: ['block-1'] }],
      elements: [
        {
          id: 'block-1',
          kind: 'text',
          role: 'paragraph',
          text: 'Signed 05/06/2025',
          spans: [{ start: 0, end: 17 }],
          locations: [{ page_number: 1, bbox: { left: 100, top: 200, right: 400, bottom: 240 } }],
          languages: [],
        },
      ],
      relations: [],
    };
    const schema = {
      type: 'object',
      properties: { signed_on: { type: 'string', format: 'date' } },
      required: ['signed_on'],
      additionalProperties: false,
    };
    for (const [hint, output] of [
      ['MM/dd/yyyy', '2025-05-06'],
      ['dd/MM/yyyy', '2025-06-05'],
    ] as const) {
      const lineage = buildExtractionLineage({
        output: { signed_on: output },
        grounding: {
          mode: 'field',
          fields: [
            {
              ...grounding.fields[0]!,
              path: 'signed_on',
              quote: '05/06/2025',
              transform_claim: {
                operation: 'date_time_format',
                parameters: { source_format: hint },
                reason: 'locale guess',
                confidence: 'high',
              },
            },
          ],
        },
        parsedDocument: datedDocument,
        llmModel: 'openai/gpt-5.6-terra',
        extractionSchema: schema,
      });
      const fieldId = fieldEntityId(lineage, '/signed_on');
      expect(lineage.entities[fieldId]?.confidence?.[0]?.score).not.toBe(1);
      expect(
        lineage.derivations.find((entry) => entry.output === fieldId)?.transformation?.attributes?.[
          'openparser:transformProof'
        ]
      ).toMatchObject({ result: 'not_applicable' });
    }
  });

  test('an oversized alias policy cannot produce derived score 1', () => {
    const aliases = Object.fromEntries(
      Array.from({ length: 16 }, (_, index) => [`alias-${index}-${'x'.repeat(200)}`, index])
    );
    const schema = {
      type: 'object',
      properties: {
        status: {
          type: 'number',
          'x-openparser-transform': {
            operation: 'enum_alias',
            parameters: { aliases, caseSensitive: true },
          },
        },
      },
      required: ['status'],
      additionalProperties: false,
    };
    expect(() => compileTransformPlan(schema)).toThrow(GroundingUnsupportedSchemaError);
    expect(() =>
      buildExtractionLineage({
        output: { status: 0 },
        grounding: {
          mode: 'field',
          fields: [
            {
              ...grounding.fields[0]!,
              path: 'status',
              quote: 'alias-0-' + 'x'.repeat(200),
            },
          ],
        },
        parsedDocument: document,
        llmModel: 'openai/gpt-5.6-terra',
        extractionSchema: schema,
      })
    ).toThrow(GroundingUnsupportedSchemaError);
    const overflow = verifyTransform({
      quote: 'alias-0-' + 'x'.repeat(200),
      output: 0,
      intent: { operation: 'enum_alias', parameters: { aliases, caseSensitive: true } },
    });
    expect(overflow.result).toBe('not_applicable');
    expect(overflow.proof.result).toBe('not_applicable');
    expect(overflow.proof.trustedParameters).toMatchObject({ reason: 'proof_too_large' });
    expect(overflow.proof.trustedParameters).not.toEqual({ bounded: true });
  });

  test('an unverifiable rewrite the model said nothing about stays unscored', () => {
    const datedDocument: ParsedDocument = {
      ...document,
      text: 'Signed MAY 30, 2024',
      markdown: 'Signed MAY 30, 2024',
      pages: [{ ...document.pages[0]!, element_ids: ['block-1'], reading_order: ['block-1'] }],
      elements: [
        {
          id: 'block-1',
          kind: 'text',
          role: 'paragraph',
          text: 'Signed MAY 30, 2024',
          spans: [{ start: 0, end: 19 }],
          locations: [{ page_number: 1, bbox: { left: 100, top: 200, right: 400, bottom: 240 } }],
          languages: [],
        },
      ],
      relations: [],
    };
    const { confidence: _dropped, ...unscored } = grounding.fields[0]!;
    const lineage = buildExtractionLineage({
      output: { signed_on: 'the following business day' },
      grounding: {
        mode: 'field',
        fields: [{ ...unscored, path: 'signed_on', quote: 'MAY 30, 2024' }],
      },
      parsedDocument: datedDocument,
      llmModel: 'openai/gpt-5.6-terra',
    });

    // Neither a deterministic check nor the model measured this inference.
    expect(lineage.entities[fieldEntityId(lineage, '/signed_on')]?.confidence).toBeUndefined();
    // The text it was rewritten from was checked against the document, and says so.
    expect(lineage.entities['source-text:/signed_on']?.confidence?.[0]).toMatchObject({
      kind: 'derived',
      method: 'source_text_alignment',
      attributes: { 'openparser:alignmentStatus': 'match_exact' },
    });
  });

  test('maps a categorical transform self-report when deterministic validation cannot help', () => {
    const datedDocument: ParsedDocument = {
      ...document,
      text: 'Signed MAY 30, 2024',
      markdown: 'Signed MAY 30, 2024',
      pages: [{ ...document.pages[0]!, element_ids: ['block-1'], reading_order: ['block-1'] }],
      elements: [
        {
          id: 'block-1',
          kind: 'text',
          role: 'paragraph',
          text: 'Signed MAY 30, 2024',
          spans: [{ start: 0, end: 19 }],
          locations: [{ page_number: 1, bbox: { left: 100, top: 200, right: 400, bottom: 240 } }],
          languages: [],
        },
      ],
      relations: [],
    };
    const lineage = buildExtractionLineage({
      output: { signed_on: 'Q2 2024' },
      grounding: {
        mode: 'field',
        fields: [
          {
            ...grounding.fields[0]!,
            path: 'signed_on',
            quote: 'MAY 30, 2024',
            transform_claim: {
              operation: 'date_time_format',
              parameters: {},
              reason: 'The date was reformatted.',
              confidence: 'medium',
            },
          },
        ],
      },
      parsedDocument: datedDocument,
      llmModel: 'openai/gpt-5.6-terra',
    });

    expect(lineage.entities[fieldEntityId(lineage, '/signed_on')]?.confidence?.[0]).toMatchObject({
      score: 0.5,
      kind: 'reported',
      scope: 'transformation',
      method: 'model_ordinal',
      calibrated: false,
      attributes: { 'openparser:ordinal': 'medium' },
    });
  });

  test('aggregates OCR word confidence onto the cited region without materializing words', () => {
    const lineage = buildExtractionLineage({
      output: { total: 125 },
      grounding,
      parsedDocument: document,
      llmModel: 'openai/gpt-5.6-terra',
    });

    // Word tokens stay in the parsed document that locator.uri addresses.
    expect(Object.keys(lineage.entities).some((id) => id.includes(':word:'))).toBe(false);
    expect((lineage.relations ?? []).some((entry) => entry.source.includes(':word:'))).toBe(false);
    expect(lineage.derivations.some((entry) => entry.output.includes(':word:'))).toBe(false);

    // The region reports on itself: its weakest word, over every word in it.
    expect(lineage.entities['source-element:block-1']?.confidence?.[0]).toMatchObject({
      scope: 'recognition_source_region',
      granularity: 'word',
      method: 'region_word_minimum',
      sampleCount: 2,
      sources: [{ type: 'activity', id: 'activity:ocr' }],
      attributes: { minimum: 0.64, maximum: 0.98 },
    });
    expect(lineage.entities['source-element:block-1']?.confidence?.[0]?.score).toBe(0.64);

    // What this field read in that region is a statement about the edge.
    const citation = lineage.derivations
      .find((entry) => entry.output === fieldEntityId(lineage, '/total'))
      ?.inputs.find((input) => input.entity === 'source-element:block-1');
    expect(citation?.confidence).toMatchObject({
      scope: 'recognition_source_region',
      method: 'cited_minimum_context_downblend',
      sampleCount: 1,
      attributes: { minimum: 0.64, maximum: 0.64, contextMean: 0.98, contextSampleCount: 1 },
    });
    // The text this field read is the extraction's own output, so the edge does
    // not restate it.
    expect(citation?.attributes).toBeUndefined();

    const totalId = fieldEntityId(lineage, '/total');
    expect(lineage.entities[totalId]?.confidence?.[0]).toMatchObject({
      scope: 'extraction',
      method: 'source_text_alignment',
    });
    expect(lineage.entities[totalId]?.confidence?.[0]?.score).toBeGreaterThan(0);
  });

  test('a badly scanned neighbor discounts a crisp value without dragging it down to itself', () => {
    // One sentence, two fields: the square footage scanned cleanly, the street
    // name did not. Each field must be scored on the words it actually read.
    const sentence =
      'The Lessor agrees to lease 2448 square feet located at 80369 Efnen Burg, California.';
    const word = (id: string, text: string, score: number) => {
      const start = sentence.indexOf(text);
      return {
        id,
        kind: 'text' as const,
        role: 'word' as const,
        text,
        spans: [{ start, end: start + text.length }],
        locations: [],
        languages: [],
        confidence: { score, scope: 'recognition' as const, calibrated: false },
      };
    };
    const words = [
      word('w-area', '2448', 0.99),
      word('w-street-number', '80369', 0.93),
      word('w-street-name', 'Efnen', 0.53),
      word('w-street-type', 'Burg', 0.57),
    ];
    const leaseDocument: ParsedDocument = {
      ...document,
      text: sentence,
      markdown: sentence,
      pages: [
        {
          ...document.pages[0]!,
          element_ids: ['block-1', ...words.map((entry) => entry.id)],
          reading_order: ['block-1'],
        },
      ],
      elements: [
        {
          id: 'block-1',
          kind: 'text',
          role: 'paragraph',
          text: sentence,
          spans: [{ start: 0, end: sentence.length }],
          locations: [{ page_number: 1, bbox: { left: 100, top: 200, right: 400, bottom: 240 } }],
          languages: [],
        },
        ...words,
      ],
      relations: words.map((entry) => ({
        type: 'contains' as const,
        from_id: 'block-1',
        to_id: entry.id,
      })),
    };
    const citations = grounding.fields[0]!.citations;
    const lineage = buildExtractionLineage({
      output: { square_feet: 2448, street_address: '80369 Efnen Burg' },
      grounding: {
        mode: 'field',
        fields: [
          { path: 'street_address', citations },
          { path: 'square_feet', citations },
        ],
      },
      parsedDocument: leaseDocument,
      llmModel: 'openai/gpt-5.6-terra',
    });

    const citedScore = (path: string) =>
      lineage.derivations
        .find((entry) => entry.output === fieldEntityId(lineage, path))
        ?.inputs.find((input) => input.entity === 'source-element:block-1')?.confidence?.score;

    // 0.99 discounted by a 0.68 neighborhood mean: lowered, but nowhere near 0.53.
    const area = citedScore('/square_feet')!;
    expect(area).toBeGreaterThan(0.94);
    expect(area).toBeLessThan(0.99);
    // The address owns its own bad words and is scored on them.
    expect(citedScore('/street_address')).toBeCloseTo(0.53, 2);
    // Listing the address first must not decide what the square footage scores.
    expect(area).toBeGreaterThan(citedScore('/street_address')!);
  });

  test('graph size tracks fields and regions, not OCR word count', () => {
    const withManyWords = (wordCount: number): ParsedDocument => {
      const words = Array.from({ length: wordCount }, (_, index) => ({
        id: `filler-${index}`,
        kind: 'text' as const,
        role: 'word' as const,
        text: `w${index}`,
        spans: [{ start: 0, end: 12 }],
        locations: [],
        languages: [],
        confidence: { score: 0.9, scope: 'recognition' as const, calibrated: false },
      }));
      return {
        ...document,
        elements: [...document.elements, ...words],
        relations: [
          ...document.relations,
          ...words.map((word) => ({
            type: 'contains' as const,
            from_id: 'block-1',
            to_id: word.id,
          })),
        ],
      };
    };

    const build = (wordCount: number) =>
      buildExtractionLineage({
        output: { total: 125 },
        grounding,
        parsedDocument: withManyWords(wordCount),
        llmModel: 'openai/gpt-5.6-terra',
      });

    const small = build(2);
    const large = build(500);

    // The invariant is that words do not become nodes: 250x the OCR tokens buys
    // the same graph, scored over more of them.
    expect(Object.keys(large.entities)).toEqual(Object.keys(small.entities));
    expect(large.derivations).toHaveLength(small.derivations.length);
    expect(Object.keys(large.entities).some((id) => id.includes('filler-'))).toBe(false);
  });

  test('excludes empty OCR word tokens from the cited-region aggregate', () => {
    const withBlankWord: ParsedDocument = {
      ...document,
      elements: [
        ...document.elements,
        {
          id: 'word-empty',
          kind: 'text',
          role: 'word',
          text: '',
          spans: [{ start: 12, end: 12 }],
          locations: [],
          languages: [],
          confidence: { score: 0.5, scope: 'recognition', calibrated: false },
        },
      ],
      relations: [
        ...document.relations,
        { type: 'contains', from_id: 'block-1', to_id: 'word-empty' },
      ],
    };
    const lineage = buildExtractionLineage({
      output: { total: 125 },
      grounding,
      parsedDocument: withBlankWord,
      llmModel: 'openai/gpt-5.6-terra',
    });

    expect(LineageDocumentSchema.parse(lineage).format).toBe('lineage@1');
    // The blank 0.5 token must not drag the cited-region minimum below 0.64.
    expect(lineage.entities['source-element:block-1']?.confidence?.[0]?.score).toBe(0.64);
  });

  test('keeps page-only confidence on the source page instead of the field evidence', () => {
    const pageDocument: ParsedDocument = {
      ...document,
      pages: [
        {
          ...document.pages[0]!,
          confidence: { score: 0.73, scope: 'recognition', calibrated: false },
        },
      ],
      elements: document.elements.map((element) =>
        element.kind === 'text' && element.role === 'word'
          ? { ...element, confidence: undefined }
          : element
      ),
    };
    const lineage = buildExtractionLineage({
      output: { total: 125 },
      grounding,
      parsedDocument: pageDocument,
      llmModel: 'openai/gpt-5.6-terra',
    });

    expect(lineage.entities['source-element:block-1']?.confidence).toBeUndefined();
    expect(
      lineage.entities['source-element:block-1']?.attributes?.['openparser:inheritedRecognition']
    ).toBe('page:1');
    expect(lineage.entities['page:1']?.confidence?.[0]).toMatchObject({
      score: 0.73,
      scope: 'recognition',
      granularity: 'page',
      kind: 'reported',
    });
  });

  test('includes schema input and records grounding on the single field derivation', () => {
    const schema = {
      type: 'object',
      properties: { total: { type: 'number' } },
      required: ['total'],
    };
    const lineage = buildExtractionLineage({
      output: { total: 125 },
      grounding,
      parsedDocument: document,
      llmModel: 'openai/gpt-5.6-terra',
      extractionSchema: schema,
    });
    const totalId = fieldEntityId(lineage, '/total');
    const producers = lineage.derivations.filter((entry) => entry.output === totalId);

    expect(lineage.entities['schema:extraction']?.value).toEqual(schema);
    // One field entity with one producer: no separate pre-grounding candidate node.
    expect(producers).toHaveLength(1);
    expect(Object.keys(lineage.entities).some((id) => id.startsWith('extracted-value:'))).toBe(
      false
    );
    // Grounding status and confidence origin are derived from the graph, not stored.
    // Read the trace before toMatchObject: bun's arrayContaining rewrites the received value.
    const trace = fieldTrace(lineage, '/total');
    expect(fieldGrounding(lineage, '/total')?.status).toBe('grounded');
    expect(trace?.field.confidenceOrigin).toBe('derived');
    expect(lineage.entities[totalId]?.attributes).toBeUndefined();
    expect(producers[0]).toMatchObject({
      activity: 'activity:extract',
      inputs: expect.arrayContaining([
        { entity: 'schema:extraction', role: 'output_schema', effect: 'direct' },
        expect.objectContaining({
          entity: 'source-element:block-1',
          role: 'resolved_source_evidence',
          effect: 'direct',
        }),
      ]),
    });
  });

  test('does not aggregate unrelated words for a table-level citation', () => {
    const tableDocument: ParsedDocument = {
      ...document,
      text: '1 1',
      markdown: '| 1 | 1 |',
      pages: [
        {
          ...document.pages[0]!,
          element_ids: ['table-1', 'table-word-1', 'table-word-2'],
          reading_order: ['table-1'],
        },
      ],
      elements: [
        {
          id: 'table-1',
          kind: 'table',
          row_count: 1,
          column_count: 2,
          cells: [
            {
              id: 'cell-1',
              row_index: 0,
              column_index: 0,
              row_span: 1,
              column_span: 1,
              role: 'body',
              text: '1',
              spans: [],
              locations: [],
              element_ids: ['table-word-1'],
            },
            {
              id: 'cell-2',
              row_index: 0,
              column_index: 1,
              row_span: 1,
              column_span: 1,
              role: 'body',
              text: '1',
              spans: [],
              locations: [],
              element_ids: ['table-word-2'],
            },
          ],
          locations: [{ page_number: 1, bbox: { left: 10, top: 10, right: 90, bottom: 20 } }],
        },
        {
          id: 'table-word-1',
          kind: 'text',
          role: 'word',
          text: '1',
          spans: [],
          locations: [],
          languages: [],
          confidence: { score: 0.95, scope: 'recognition', calibrated: false },
        },
        {
          id: 'table-word-2',
          kind: 'text',
          role: 'word',
          text: '1',
          spans: [],
          locations: [],
          languages: [],
          confidence: { score: 0.55, scope: 'recognition', calibrated: false },
        },
      ],
      relations: [],
    };
    const lineage = buildExtractionLineage({
      output: { amount: 1 },
      grounding: {
        mode: 'field',
        fields: [
          {
            path: 'amount',
            citations: [
              {
                element_id: 'table-1',
                page_number: 1,
                bbox: { left: 10, top: 10, right: 90, bottom: 20 },
                source_type: 'table',
                granularity: 'element',
              },
            ],
          },
        ],
      },
      parsedDocument: tableDocument,
      llmModel: 'openai/gpt-5.6-terra',
    });

    expect(Object.keys(lineage.entities).filter((id) => id.includes(':word:'))).toEqual([]);
    expect(lineage.entities['source-element:table-1']?.confidence).toBeUndefined();
  });

  test('models logical Mistral cells without inventing cell geometry, confidence, or words', () => {
    const table: ParsedDocument = {
      ...document,
      text: 'A 10 B 20 C 30',
      markdown: '| A | 10 |\n| B | 20 |\n| C | 30 |',
      pages: [
        {
          ...document.pages[0]!,
          element_ids: ['mistral-table'],
          reading_order: ['mistral-table'],
          confidence: { score: 0.673693, scope: 'recognition', calibrated: false },
        },
      ],
      elements: [
        {
          id: 'mistral-table',
          kind: 'table',
          row_count: 3,
          column_count: 2,
          cells: ['A', '10', 'B', '20', 'C', '30'].map((text, index) => ({
            id: `cell-${index}`,
            row_index: Math.floor(index / 2),
            column_index: index % 2,
            row_span: 1,
            column_span: 1,
            role: 'body' as const,
            text,
            spans: [],
            locations: [],
            element_ids: [],
          })),
          locations: [{ page_number: 1, bbox: { left: 10, top: 20, right: 900, bottom: 600 } }],
        },
      ],
      relations: [],
    };
    const citations = [1, 3, 5].map((cellIndex) => ({
      element_id: 'mistral-table',
      table_cell_id: `cell-${cellIndex}`,
      page_number: 1,
      bbox: { left: 10, top: 20, right: 900, bottom: 600 },
      source_type: 'table' as const,
      granularity: 'element' as const,
    }));
    const lineage = buildExtractionLineage({
      output: { a: 10, b: 20, c: 30 },
      grounding: {
        mode: 'field',
        fields: ['a', 'b', 'c'].map((path, index) => ({
          path,
          citations: [citations[index]!],
        })),
      },
      parsedDocument: table,
      llmModel: 'mistral-small',
    });

    for (const id of ['source-cell:cell-1', 'source-cell:cell-3', 'source-cell:cell-5']) {
      expect(lineage.entities[id]?.selector?.value).toMatchObject({
        geometryGranularity: 'unavailable',
      });
      expect(lineage.entities[id]?.confidence).toBeUndefined();
    }
    expect(lineage.entities['source-element:mistral-table']?.selector?.value).toMatchObject({
      geometryGranularity: 'element',
      bbox: { left: 10, top: 20, right: 900, bottom: 600 },
    });
    expect(lineage.entities['page:1']?.confidence?.[0]?.score).toBe(0.673693);
    expect(Object.keys(lineage.entities).some((id) => id.includes(':word:'))).toBe(false);

    const tableWithCellGeometry = structuredClone(table);
    const tableElement = tableWithCellGeometry.elements[0];
    if (!tableElement || tableElement.kind !== 'table') throw new Error('expected table');
    tableElement.cells[1]!.locations = [
      { page_number: 1, bbox: { left: 400, top: 20, right: 500, bottom: 80 } },
    ];
    const precise = buildExtractionLineage({
      output: { a: 10 },
      grounding: {
        mode: 'field',
        fields: [
          {
            path: 'a',
            citations: [
              {
                ...citations[0]!,
                bbox: { left: 400, top: 20, right: 500, bottom: 80 },
                granularity: 'table_cell',
              },
            ],
          },
        ],
      },
      parsedDocument: tableWithCellGeometry,
      llmModel: 'mistral-small',
    });
    expect(precise.entities['source-cell:cell-1']?.selector?.value).toMatchObject({
      geometryGranularity: 'table_cell',
      bbox: { left: 400, top: 20, right: 500, bottom: 80 },
    });
  });

  test('gives a table one producer when it is cited both directly and through a cell', () => {
    const table: ParsedDocument = {
      ...document,
      text: 'A 10 B 20',
      markdown: '| A | 10 |\n| B | 20 |',
      pages: [{ ...document.pages[0]!, element_ids: ['tbl'], reading_order: ['tbl'] }],
      elements: [
        {
          id: 'tbl',
          kind: 'table',
          row_count: 2,
          column_count: 2,
          cells: ['A', '10', 'B', '20'].map((text, index) => ({
            id: `cell-${index}`,
            row_index: Math.floor(index / 2),
            column_index: index % 2,
            row_span: 1,
            column_span: 1,
            role: 'body' as const,
            text,
            spans: [],
            locations: [],
            element_ids: [],
          })),
          locations: [{ page_number: 1, bbox: { left: 10, top: 20, right: 900, bottom: 600 } }],
        },
      ],
      relations: [],
    };
    const bbox = { left: 10, top: 20, right: 900, bottom: 600 };

    const lineage = buildExtractionLineage({
      output: { total: 10, summary: 'A 10 B 20' },
      grounding: {
        mode: 'field',
        fields: [
          {
            path: 'total',
            citations: [
              {
                element_id: 'tbl',
                table_cell_id: 'cell-1',
                page_number: 1,
                bbox,
                source_type: 'table',
                granularity: 'element',
              },
            ],
          },
          {
            path: 'summary',
            citations: [
              {
                element_id: 'tbl',
                page_number: 1,
                bbox,
                source_type: 'table',
                granularity: 'element',
              },
            ],
          },
        ],
      },
      parsedDocument: table,
      llmModel: 'mistral-small',
    });

    const producers = lineage.derivations.filter(
      (derivation) => derivation.output === 'source-element:tbl'
    );
    expect(producers).toHaveLength(1);
    expect(entityAncestors(lineage, 'source-cell:cell-1')).toContain('source-element:tbl');
  });

  test('keeps empty containers and ungrounded values in the graph', () => {
    const lineage = buildExtractionLineage({
      output: { items: [], metadata: {} },
      grounding: { mode: 'field', fields: [] },
      parsedDocument: document,
      llmModel: 'openai/gpt-5.6-terra',
    });

    expect(
      lineage.outputs.map((id) => ({
        path: lineage.entities[id]?.path,
        value: lineage.entities[id]?.value,
        status: fieldGrounding(lineage, lineage.entities[id]?.path ?? '')?.status,
      }))
    ).toEqual([
      { path: '/items', value: [], status: 'ungrounded' },
      { path: '/metadata', value: {}, status: 'ungrounded' },
    ]);
  });

  test('keeps dotted property names as one JSON Pointer segment through review', () => {
    const machine = buildExtractionLineage({
      output: { 'invoice.total': 125 },
      grounding: {
        mode: 'field',
        fields: [{ ...grounding.fields[0]!, path: 'invoice.total' }],
      },
      parsedDocument: document,
      llmModel: 'openai/gpt-5.6-terra',
    });

    expect(machine.entities[fieldEntityId(machine, '/invoice.total')]?.value).toBe(125);

    const reviewed = appendExtractionReviewLineage({
      lineage: machine,
      correctedOutput: { 'invoice.total': 130 },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/invoice.total',
          previous_value: 125,
          value: 130,
        },
      ],
    });
    expect(reviewed.entities['review:value:1:0']).toMatchObject({
      path: '/invoice.total',
      value: 130,
    });
  });
});
