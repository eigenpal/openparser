import type { z } from 'zod';

/** Stable contract message for empty pipeline extraction schemas. */
export const PIPELINE_EXTRACTION_SCHEMA_EMPTY_PROPERTIES_MESSAGE =
  'extraction pipeline schema must include at least one named property';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function typeList(schema: Record<string, unknown>): string[] {
  if (typeof schema.type === 'string') return [schema.type];
  if (Array.isArray(schema.type)) {
    return schema.type.filter((t): t is string => typeof t === 'string');
  }
  return [];
}

function isObjectRootSchema(schema: Record<string, unknown>): boolean {
  const types = typeList(schema);
  if (types.includes('object')) return true;
  return types.length === 0 && isPlainObject(schema.properties);
}

/**
 * Count root-level named properties when `schema` is an object extraction schema.
 * Returns `null` when the value is not a supported object root.
 */
export function pipelineExtractionSchemaRootPropertyCount(
  schema: Record<string, unknown>
): number | null {
  if (!isPlainObject(schema)) return null;
  if (!isObjectRootSchema(schema)) return null;
  if (!isPlainObject(schema.properties)) return null;
  return Object.keys(schema.properties).length;
}

/** Whether a pipeline extraction schema has a valid object root with at least one property. */
export function hasPipelineExtractionSchemaProperties(schema: Record<string, unknown>): boolean {
  const count = pipelineExtractionSchemaRootPropertyCount(schema);
  return count !== null && count > 0;
}

/** Zod refinement for pipeline create/update `schema` fields. */
export function refinePipelineExtractionSchema(
  schema: unknown,
  ctx: z.RefinementCtx,
  path: (string | number)[] = ['schema']
): void {
  if (!isPlainObject(schema)) {
    ctx.addIssue({
      code: 'custom',
      message: 'schema must be an object',
      path,
    });
    return;
  }
  const count = pipelineExtractionSchemaRootPropertyCount(schema);
  if (count === null) {
    ctx.addIssue({
      code: 'custom',
      message: 'schema root must be an object schema with explicit properties',
      path,
    });
    return;
  }
  if (count === 0) {
    ctx.addIssue({
      code: 'custom',
      message: PIPELINE_EXTRACTION_SCHEMA_EMPTY_PROPERTIES_MESSAGE,
      path,
    });
  }
}
