/**
 * Strict structured-output schema normalization for OpenRouter / OpenAI-compatible
 * `response_format.json_schema` with `strict: true`.
 *
 * Providers require every object node to set `additionalProperties: false` and list
 * every `properties` key in `required`. Studio historically emitted the root flag
 * only; saved pipelines and external clients may omit nested flags. Missing /
 * `true` / `{}` additionalProperties are safe to close for extraction. Schema-valued
 * additionalProperties (open maps) change semantics and are rejected with a path.
 */

export class StrictExtractionSchemaError extends Error {
  readonly code = 'invalid_schema' as const;
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'StrictExtractionSchemaError';
  }
}

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

function isObjectSchema(schema: Record<string, unknown>): boolean {
  const types = typeList(schema);
  if (types.includes('object')) return true;
  return types.length === 0 && isPlainObject(schema.properties);
}

/** Values we can safely close without inventing map / free-form object semantics. */
function canCoerceAdditionalProperties(value: unknown): boolean {
  if (value === undefined || value === true) return true;
  return isPlainObject(value) && Object.keys(value).length === 0;
}

function normalizeObjectNode(schema: Record<string, unknown>, path: string): void {
  const additional = schema.additionalProperties;
  if (
    additional !== undefined &&
    additional !== false &&
    !canCoerceAdditionalProperties(additional)
  ) {
    throw new StrictExtractionSchemaError(
      `${path}: object schemas require additionalProperties: false for strict structured outputs (open maps / schema-valued additionalProperties are not supported)`
    );
  }

  if (!isPlainObject(schema.properties)) {
    throw new StrictExtractionSchemaError(
      `${path}: object schemas require explicit properties for strict structured outputs`
    );
  }

  const properties = schema.properties;
  if (additional !== false) {
    schema.additionalProperties = false;
  }

  // Keep caller-declared required order for idempotent request hashing; only
  // append missing keys (sorted) so property insertion order cannot reshuffle
  // an already-complete required list.
  const propKeys = Object.keys(properties);
  const propKeySet = new Set(propKeys);
  const existingRequired = Array.isArray(schema.required)
    ? schema.required.filter((key): key is string => typeof key === 'string' && propKeySet.has(key))
    : [];
  const existingSet = new Set(existingRequired);
  const missing = propKeys.filter((key) => !existingSet.has(key)).sort();
  schema.required = [...existingRequired, ...missing];

  for (const [key, child] of Object.entries(properties)) {
    normalizeNode(child, `${path}.${key}`);
  }
}

function normalizeNode(schema: unknown, path: string): void {
  if (!isPlainObject(schema)) {
    throw new StrictExtractionSchemaError(`${path}: schema must be an object`);
  }

  if (isObjectSchema(schema)) {
    normalizeObjectNode(schema, path);
  }

  const types = typeList(schema);
  if (types.includes('array')) {
    if (!('items' in schema)) {
      throw new StrictExtractionSchemaError(
        `${path}: array schemas require items for strict structured outputs`
      );
    }
    normalizeNode(schema.items, `${path}[]`);
  }

  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
    const branch = schema[key];
    if (!Array.isArray(branch)) continue;
    branch.forEach((child, index) => normalizeNode(child, `${path}.${key}[${index}]`));
  }
}

/**
 * Deep-clone + normalize a caller extraction schema for strict structured outputs.
 * Mutates only the clone. Throws {@link StrictExtractionSchemaError} when the
 * schema cannot be made strict without changing open-map semantics.
 */
export function normalizeStrictExtractionSchema(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const clone = structuredClone(schema) as Record<string, unknown>;
  const types = typeList(clone);
  const isObjectRoot =
    (types.length === 1 && types[0] === 'object') ||
    (types.length === 0 && isPlainObject(clone.properties)) ||
    (types.includes('object') && types.includes('null') && types.length === 2);
  if (!isObjectRoot) {
    throw new StrictExtractionSchemaError(
      '$: extraction schema root must be an object for strict structured outputs'
    );
  }
  normalizeNode(clone, '$');
  return clone;
}
