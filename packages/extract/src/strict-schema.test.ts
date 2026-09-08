import { describe, expect, test } from 'bun:test';
import { normalizeStrictExtractionSchema, StrictExtractionSchemaError } from './strict-schema';

/** Prod incident shape: nested object missing additionalProperties:false. */
const INCIDENT_SCHEMA = {
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
      // intentionally omitted additionalProperties
    },
  },
  required: ['vendor', 'address'],
  additionalProperties: false,
} as const;

function countObjectNodes(node: unknown): { total: number; withAdditionalFalse: number } {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return { total: 0, withAdditionalFalse: 0 };
  }
  const schema = node as Record<string, unknown>;
  let total = 0;
  let withAdditionalFalse = 0;
  if (schema.type === 'object' || (schema.properties && typeof schema.properties === 'object')) {
    total += 1;
    if (schema.additionalProperties === false) withAdditionalFalse += 1;
  }
  if (
    schema.properties &&
    typeof schema.properties === 'object' &&
    !Array.isArray(schema.properties)
  ) {
    for (const child of Object.values(schema.properties as Record<string, unknown>)) {
      const nested = countObjectNodes(child);
      total += nested.total;
      withAdditionalFalse += nested.withAdditionalFalse;
    }
  }
  if ('items' in schema) {
    const nested = countObjectNodes(schema.items);
    total += nested.total;
    withAdditionalFalse += nested.withAdditionalFalse;
  }
  return { total, withAdditionalFalse };
}

describe('normalizeStrictExtractionSchema', () => {
  test('fixes the prod incident shape: nested object gains additionalProperties:false', () => {
    const before = countObjectNodes(INCIDENT_SCHEMA);
    expect(before.total).toBe(2);
    expect(before.withAdditionalFalse).toBe(1);

    const normalized = normalizeStrictExtractionSchema(
      structuredClone(INCIDENT_SCHEMA) as Record<string, unknown>
    );

    const after = countObjectNodes(normalized);
    expect(after.total).toBe(2);
    expect(after.withAdditionalFalse).toBe(2);
    expect(normalized).toEqual({
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

  test('closes nested array-item objects and coerces true/{} additionalProperties', () => {
    const normalized = normalizeStrictExtractionSchema({
      type: 'object',
      properties: {
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: { amount: { type: 'number' } },
            additionalProperties: true,
          },
        },
        meta: {
          type: 'object',
          properties: { note: { type: 'string' } },
          additionalProperties: {},
        },
      },
    });

    expect(normalized).toEqual({
      type: 'object',
      properties: {
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: { amount: { type: 'number' } },
            required: ['amount'],
            additionalProperties: false,
          },
        },
        meta: {
          type: 'object',
          properties: { note: { type: 'string' } },
          required: ['note'],
          additionalProperties: false,
        },
      },
      required: ['lines', 'meta'],
      additionalProperties: false,
    });
  });

  test('preserves declared required order and fills missing keys stably', () => {
    const normalized = normalizeStrictExtractionSchema({
      type: 'object',
      properties: {
        b: { type: 'string' },
        a: { type: 'string' },
        c: { type: 'string' },
      },
      required: ['c'],
    });
    expect(normalized.required).toEqual(['c', 'a', 'b']);
  });

  test('rejects schema-valued additionalProperties with an actionable path', () => {
    expect(() =>
      normalizeStrictExtractionSchema({
        type: 'object',
        properties: {
          tags: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
      })
    ).toThrow(StrictExtractionSchemaError);

    try {
      normalizeStrictExtractionSchema({
        type: 'object',
        properties: {
          tags: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(StrictExtractionSchemaError);
      expect((error as StrictExtractionSchemaError).reason).toContain('$.tags');
      expect((error as StrictExtractionSchemaError).reason).toContain(
        'additionalProperties: false'
      );
    }
  });

  test('rejects non-object roots', () => {
    expect(() =>
      normalizeStrictExtractionSchema({ type: 'array', items: { type: 'string' } })
    ).toThrow(/root must be an object/);
  });
});
