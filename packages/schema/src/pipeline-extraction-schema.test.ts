import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import {
  PIPELINE_EXTRACTION_SCHEMA_EMPTY_PROPERTIES_MESSAGE,
  hasPipelineExtractionSchemaProperties,
  pipelineExtractionSchemaRootPropertyCount,
  refinePipelineExtractionSchema,
} from './pipeline-extraction-schema';
import {
  CreateExtractionPipelineRequestSchema,
  UpdateExtractionPipelineRequestSchema,
} from './pipelines';

const VALID_PIPELINE_BODY = {
  name: 'Invoice',
  ocr_model: 'paddleocr-vl-1.6',
  llm_model: 'openai/gpt-4.1-mini',
  schema: {
    type: 'object',
    properties: { vendor: { type: 'string' } },
    required: ['vendor'],
    additionalProperties: false,
  },
} as const;

describe('pipeline extraction schema contract', () => {
  test('accepts object schemas with at least one named property', () => {
    expect(hasPipelineExtractionSchemaProperties(VALID_PIPELINE_BODY.schema)).toBe(true);
    expect(pipelineExtractionSchemaRootPropertyCount(VALID_PIPELINE_BODY.schema)).toBe(1);
    expect(CreateExtractionPipelineRequestSchema.safeParse(VALID_PIPELINE_BODY).success).toBe(true);
  });

  test('rejects empty properties objects', () => {
    const empty = {
      type: 'object',
      properties: {},
      additionalProperties: false,
    };
    expect(hasPipelineExtractionSchemaProperties(empty)).toBe(false);
    expect(pipelineExtractionSchemaRootPropertyCount(empty)).toBe(0);

    const parsed = CreateExtractionPipelineRequestSchema.safeParse({
      ...VALID_PIPELINE_BODY,
      schema: empty,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some(
          (issue) => issue.message === PIPELINE_EXTRACTION_SCHEMA_EMPTY_PROPERTIES_MESSAGE
        )
      ).toBe(true);
    }
  });

  test('rejects missing or non-object root schemas', () => {
    for (const schema of [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } },
      { properties: 'not-an-object' },
    ]) {
      expect(hasPipelineExtractionSchemaProperties(schema as Record<string, unknown>)).toBe(false);
      expect(
        pipelineExtractionSchemaRootPropertyCount(schema as Record<string, unknown>)
      ).toBeNull();
    }

    const parsed = CreateExtractionPipelineRequestSchema.safeParse({
      ...VALID_PIPELINE_BODY,
      schema: { type: 'string' },
    });
    expect(parsed.success).toBe(false);
  });

  test('update validates schema when provided', () => {
    const parsed = UpdateExtractionPipelineRequestSchema.safeParse({
      schema: { type: 'object', properties: {} },
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some(
          (issue) => issue.message === PIPELINE_EXTRACTION_SCHEMA_EMPTY_PROPERTIES_MESSAGE
        )
      ).toBe(true);
    }
  });

  test('refinePipelineExtractionSchema reports actionable paths', () => {
    const issues: Array<{ message?: string; path?: (string | number)[] }> = [];
    const ctx = {
      addIssue(issue: { code: 'custom'; message: string; path: (string | number)[] }) {
        issues.push(issue);
      },
    } as z.RefinementCtx;

    refinePipelineExtractionSchema({ type: 'object', properties: {} }, ctx);
    expect(issues).toEqual([
      expect.objectContaining({
        message: PIPELINE_EXTRACTION_SCHEMA_EMPTY_PROPERTIES_MESSAGE,
        path: ['schema'],
      }),
    ]);
  });
});
