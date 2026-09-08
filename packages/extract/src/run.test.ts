import type { ParsedDocument } from '@openparser/schema';
import { describe, expect, test } from 'bun:test';
import { GROUNDED_EXTRACT_PROMPT } from './prompts';
import {
  ExtractionSchemaFailure,
  isGroundedExtractionSchemaSupported,
  runGroundedExtraction,
  type ExtractionAttemptOutcome,
  type StructuredExtractionRequest,
} from './run';
import { StrictExtractionSchemaError } from './strict-schema';

const DOC: ParsedDocument = {
  output_format: 'openparser@1',
  document_id: 'doc_ground',
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
      locations: [
        {
          page_number: 1,
          bbox: { left: 1, top: 1, right: 10, bottom: 10 },
        },
      ],
      confidence: {
        score: 0.95,
        scope: 'detection',
        calibrated: false,
        source_value: 0.95,
        source_scale: 'zero_to_one',
      },
    },
  ],
  text_annotations: [],
  relations: [],
  assets: [],
};

const SCHEMA = {
  type: 'object',
  properties: { greeting: { type: 'string' } },
  required: ['greeting'],
  additionalProperties: false,
};

function jsonContent(value: unknown): string {
  return JSON.stringify(value);
}

describe('runGroundedExtraction', () => {
  test('default-off parity returns unwrapped ordinary output without grounding', async () => {
    const requests: StructuredExtractionRequest[] = [];
    const result = await runGroundedExtraction({
      schema: SCHEMA,
      parsedDocument: DOC,
      repairAttempts: 0,
      complete: async (request) => {
        requests.push(request);
        return {
          content: jsonContent({ greeting: 'Hello' }),
          inputTokens: 3,
          outputTokens: 2,
          costUsd: 0.001,
        };
      },
    });

    expect(result.output).toEqual({ greeting: 'Hello' });
    expect(result.grounding).toBeUndefined();
    expect(requests).toHaveLength(1);
    expect(requests[0]!.userMessage).toContain('DOCUMENT:\nHello');
    expect(requests[0]!.userMessage).not.toContain('<element id=');
    expect((requests[0]!.schema.properties as { greeting?: unknown }).greeting).toBeDefined();
    expect(result.attempts).toEqual([
      {
        attemptIndex: 0,
        kind: 'primary',
        status: 'succeeded',
        inputTokens: 3,
        outputTokens: 2,
        costUsd: 0.001,
      },
    ]);
  });

  test('field grounding unwraps flat envelope, verifies ids, and repairs against model schema', async () => {
    const requests: StructuredExtractionRequest[] = [];
    const result = await runGroundedExtraction({
      schema: SCHEMA,
      parsedDocument: DOC,
      repairAttempts: 1,
      grounding: 'field',
      complete: async (request) => {
        requests.push(request);
        if (requests.length === 1) {
          return { content: jsonContent({ greeting: 'Hello' }), inputTokens: 5, outputTokens: 2 };
        }
        return {
          content: jsonContent({
            values: { greeting: 'Hello' },
            fields: [
              {
                path: 'greeting',
                source_ids: ['e0', 'fabricated'],
                reason: 'The cited element contains Hello.',
                quote: 'Hello',
              },
            ],
          }),
          inputTokens: 8,
          outputTokens: 4,
          costUsd: 0.002,
        };
      },
    });

    expect(requests).toHaveLength(2);
    expect(requests[0]!.userMessage).toContain('<element id="e0"');
    expect((requests[0]!.schema.properties as { values?: unknown }).values).toBeDefined();
    expect((requests[0]!.schema.properties as { fields?: unknown }).fields).toBeDefined();
    expect(requests[0]!.schema.required).toEqual(['values', 'fields']);
    expect((requests[0]!.schema.properties as { greeting?: unknown }).greeting).toBeUndefined();
    expect(requests[1]!.repairFeedback?.errors.length).toBeGreaterThan(0);
    expect(requests[1]!.userMessage).toContain('SCHEMA REPAIR:');
    expect(requests[0]!.prompt).toBe(requests[1]!.prompt);

    expect(result.output).toEqual({ greeting: 'Hello' });
    expect(result.grounding?.mode).toBe('field');
    expect(result.grounding?.fields[0]?.citations[0]?.element_id).toBe('e0');
    expect(result.grounding?.fields[0]?.citations[0]?.granularity).toBe('element');
    expect(result.grounding?.fields[0]?.dropped_source_ids).toEqual(['fabricated']);
    expect(result.grounding?.fields[0]?.reason).toBe('The cited element contains Hello.');
    expect(result.grounding?.fields[0]?.quote).toBe('Hello');
    expect(result.grounding?.fields[0]?.transform_claim).toBeUndefined();
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]?.status).toBe('failed');
    expect(result.attempts[1]?.status).toBe('succeeded');
  });

  test('a provider that leaves out the narrative still yields a valid extraction', async () => {
    let requestedRequired: unknown;
    const result = await runGroundedExtraction({
      schema: SCHEMA,
      parsedDocument: DOC,
      repairAttempts: 1,
      grounding: 'field',
      complete: async (request) => {
        requestedRequired = (
          request.schema.properties as { fields: { items: { required: unknown } } }
        ).fields.items.required;
        return {
          content: jsonContent({
            values: { greeting: 'Hello' },
            fields: [{ path: 'greeting', source_ids: ['e0'] }],
          }),
          inputTokens: 5,
          outputTokens: 2,
        };
      },
    });

    expect(requestedRequired).toEqual(['path', 'source_ids', 'reason', 'quote', 'transform_claim']);
    expect(result.attempts).toHaveLength(1);
    expect(result.output).toEqual({ greeting: 'Hello' });
    expect(result.grounding?.fields[0]?.citations[0]?.element_id).toBe('e0');
    expect(result.grounding?.fields[0]?.reason).toBeUndefined();
  });

  test('indeterminate completion is not redispatched', async () => {
    let calls = 0;
    const hooks: ExtractionAttemptOutcome[] = [];
    await expect(
      runGroundedExtraction({
        schema: SCHEMA,
        parsedDocument: DOC,
        repairAttempts: 2,
        grounding: 'field',
        hooks: {
          async afterAttempt(attempt) {
            hooks.push(attempt);
          },
        },
        complete: async () => {
          calls += 1;
          const error = new Error('ambiguous provider response: HTTP 503') as Error & {
            extractionAttemptStatus: 'indeterminate';
          };
          error.extractionAttemptStatus = 'indeterminate';
          throw error;
        },
      })
    ).rejects.toThrow(/indeterminate|ambiguous/i);
    expect(calls).toBe(1);
    expect(hooks).toEqual([
      {
        attemptIndex: 0,
        kind: 'primary',
        status: 'indeterminate',
        inputTokens: null,
        outputTokens: null,
        costUsd: null,
        error: 'ambiguous provider response: HTTP 503',
        providerError: null,
      },
    ]);
  });

  test('normalizes nested additionalProperties:false before the completion port', async () => {
    let capturedSchema: Record<string, unknown> | null = null;
    await runGroundedExtraction({
      schema: {
        type: 'object',
        properties: {
          vendor: { type: 'string' },
          address: {
            type: 'object',
            properties: {
              city: { type: 'string' },
              country: { type: 'string' },
            },
            required: ['city', 'country'],
          },
        },
        required: ['vendor', 'address'],
        additionalProperties: false,
      },
      parsedDocument: DOC,
      repairAttempts: 0,
      complete: async (request) => {
        capturedSchema = request.schema;
        return {
          content: jsonContent({ vendor: 'Acme', address: { city: 'Berlin', country: 'DE' } }),
        };
      },
    });

    expect(capturedSchema).toMatchObject({
      type: 'object',
      properties: {
        vendor: { type: 'string' },
        address: {
          type: 'object',
          properties: {
            city: { type: 'string' },
            country: { type: 'string' },
          },
          required: ['city', 'country'],
          additionalProperties: false,
        },
      },
      required: ['vendor', 'address'],
      additionalProperties: false,
    });
  });

  test('invalid caller schema fails closed before any completion', async () => {
    let calls = 0;
    await expect(
      runGroundedExtraction({
        schema: {
          type: 'object',
          properties: {
            extra: { type: 'object', additionalProperties: { type: 'string' } },
          },
          required: ['extra'],
          additionalProperties: false,
        },
        parsedDocument: DOC,
        repairAttempts: 1,
        complete: async () => {
          calls += 1;
          return { content: '{}' };
        },
      })
    ).rejects.toBeInstanceOf(StrictExtractionSchemaError);
    expect(calls).toBe(0);
  });

  test('exhausted schema repair throws ExtractionSchemaFailure', async () => {
    await expect(
      runGroundedExtraction({
        schema: SCHEMA,
        parsedDocument: DOC,
        repairAttempts: 1,
        complete: async () => ({ content: '{"nope":true}' }),
      })
    ).rejects.toBeInstanceOf(ExtractionSchemaFailure);
  });

  test('fencing hooks run around each attempt', async () => {
    const events: string[] = [];
    await runGroundedExtraction({
      schema: SCHEMA,
      parsedDocument: DOC,
      repairAttempts: 0,
      hooks: {
        requireLease() {
          events.push('lease');
        },
        async beforeDispatch({ attemptIndex, kind }) {
          events.push(`before:${kind}:${attemptIndex}`);
        },
        async afterAttempt(attempt) {
          events.push(`after:${attempt.status}`);
        },
      },
      complete: async () => {
        events.push('complete');
        return { content: jsonContent({ greeting: 'Hello' }) };
      },
    });
    expect(events).toEqual(['lease', 'before:primary:0', 'complete', 'after:succeeded']);
  });

  test('caller prompt is retained on primary and repair attempts', async () => {
    const requests: StructuredExtractionRequest[] = [];
    await runGroundedExtraction({
      schema: SCHEMA,
      parsedDocument: DOC,
      repairAttempts: 1,
      grounding: 'field',
      prompt: 'Prefer the letterhead vendor.',
      complete: async (request) => {
        requests.push(request);
        if (requests.length === 1) {
          return { content: jsonContent({ greeting: 'Hello' }), inputTokens: 5, outputTokens: 2 };
        }
        return {
          content: jsonContent({
            values: { greeting: 'Hello' },
            fields: [{ path: 'greeting', source_ids: ['e0'], quote: 'Hello' }],
          }),
          inputTokens: 8,
          outputTokens: 4,
        };
      },
    });

    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request.prompt.startsWith(GROUNDED_EXTRACT_PROMPT)).toBe(true);
      expect(request.prompt).toContain('Prefer the letterhead vendor.');
    }
    expect(requests[0]!.prompt).toBe(requests[1]!.prompt);
    expect(requests[1]!.repairFeedback).not.toBeNull();
  });
});

describe('isGroundedExtractionSchemaSupported', () => {
  test('accepts object schemas after strict additionalProperties coercion', () => {
    expect(
      isGroundedExtractionSchemaSupported({
        type: 'object',
        properties: { vendor: { type: 'string' } },
      })
    ).toBe(true);
  });

  test('rejects open maps and non-object roots', () => {
    expect(
      isGroundedExtractionSchemaSupported({
        type: 'object',
        additionalProperties: { type: 'string' },
      })
    ).toBe(false);
    expect(
      isGroundedExtractionSchemaSupported({
        type: 'array',
        items: { type: 'string' },
      })
    ).toBe(false);
    expect(isGroundedExtractionSchemaSupported({ type: 'string' })).toBe(false);
  });
});
