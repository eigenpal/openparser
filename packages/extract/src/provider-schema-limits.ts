/**
 * Provider-specific strict structured-output schema budgets.
 *
 * Anthropic compiles strict JSON Schemas into a decoding grammar and rejects a
 * schema with more than 16 union-typed parameters (`type: [T, "null"]` or
 * `anyOf`) or more than 24 optional parameters with an HTTP 400. Extraction
 * schemas routinely declare every absent-able field as nullable, so a schema
 * with ~20 nullable fields works on OpenAI and fails on every Anthropic model.
 *
 * For such providers the model-facing schema demotes the overflow nullable
 * properties to their non-null type and drops them from `required`: the model
 * omits the key instead of writing `null`. {@link restoreDemotedNulls} puts
 * the `null` back before the response is validated against the caller's
 * original schema, so the accepted output is unchanged.
 */

export type StructuredOutputSchemaLimits = {
  maxUnionParameters: number;
  maxOptionalParameters: number;
};

/** https://platform.claude.com/docs/en/build-with-claude/structured-outputs (schema complexity limits). */
export const ANTHROPIC_STRUCTURED_OUTPUT_LIMITS: StructuredOutputSchemaLimits = {
  maxUnionParameters: 16,
  maxOptionalParameters: 24,
};

/**
 * Limits for a model id, or null when the provider has no known budget.
 * Matches OpenRouter (`anthropic/…`, `~anthropic/…`), Bedrock (`…anthropic.claude…`)
 * and bare Anthropic ids (`claude-…`).
 */
export function structuredOutputSchemaLimitsForModel(
  model: string | null | undefined
): StructuredOutputSchemaLimits | null {
  if (!model) return null;
  return /anthropic|(^|[/.])claude[-.]/i.test(model) ? ANTHROPIC_STRUCTURED_OUTPUT_LIMITS : null;
}

export type ProviderSchemaFit = {
  /** Schema to send to the provider. Same object as the input when nothing changed. */
  schema: Record<string, unknown>;
  /** Fills `null` for demoted properties the model omitted. Identity when nothing changed. */
  restore: (value: unknown) => unknown;
};

/** Keyed by the `properties` object, which survives the shallow copy of a demoted parent. */
type Demotions = WeakMap<Record<string, unknown>, Set<string>>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnion(schema: Record<string, unknown>): boolean {
  return (
    (Array.isArray(schema.type) && schema.type.length > 1) ||
    Array.isArray(schema.anyOf) ||
    Array.isArray(schema.oneOf)
  );
}

/** Children reachable as nested parameters (properties, items, union branches). */
function childSchemas(schema: Record<string, unknown>): unknown[] {
  const children: unknown[] = [];
  if (isPlainObject(schema.properties)) children.push(...Object.values(schema.properties));
  if (schema.items !== undefined) children.push(schema.items);
  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
    if (Array.isArray(schema[key])) children.push(...schema[key]);
  }
  return children;
}

function countSchema(schema: unknown): { unions: number; optional: number } {
  if (!isPlainObject(schema)) return { unions: 0, optional: 0 };
  let unions = isUnion(schema) ? 1 : 0;
  let optional = 0;
  if (isPlainObject(schema.properties)) {
    const required = new Set(Array.isArray(schema.required) ? schema.required : []);
    optional += Object.keys(schema.properties).filter((key) => !required.has(key)).length;
  }
  for (const child of childSchemas(schema)) {
    const counts = countSchema(child);
    unions += counts.unions;
    optional += counts.optional;
  }
  return { unions, optional };
}

/**
 * The non-null form of a nullable property schema, or null when it is not a
 * plain two-way `T | null` union we can express as "omit the key".
 */
function nonNullForm(schema: Record<string, unknown>): Record<string, unknown> | null {
  if ('const' in schema || 'default' in schema) return null;
  if (Array.isArray(schema.type)) {
    if (schema.type.length !== 2 || !schema.type.includes('null')) return null;
    if ('anyOf' in schema || 'oneOf' in schema) return null;
    const type = schema.type.find((t) => t !== 'null');
    if (typeof type !== 'string') return null;
    const next: Record<string, unknown> = { ...schema, type };
    if (Array.isArray(schema.enum)) {
      const values = schema.enum.filter((v) => v !== null);
      if (values.length === 0) return null;
      next.enum = values;
    }
    return next;
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length === 2 && schema.type === undefined) {
    const isNull = (s: unknown) =>
      isPlainObject(s) && s.type === 'null' && Object.keys(s).length === 1;
    const nulls = schema.anyOf.filter(isNull);
    const rest = schema.anyOf.filter((s) => !isNull(s));
    if (nulls.length !== 1 || rest.length !== 1 || !isPlainObject(rest[0])) return null;
    const { anyOf: _anyOf, ...annotations } = schema;
    return { ...annotations, ...rest[0] };
  }
  return null;
}

const OMIT_HINT = 'Omit this property when the value is absent.';

/** Collect demotable (objectSchema, key) pairs in document order. */
function demotionCandidates(
  schema: unknown,
  out: Array<{ owner: Record<string, unknown>; key: string }>
): void {
  if (!isPlainObject(schema)) return;
  if (isPlainObject(schema.properties)) {
    const required = new Set(Array.isArray(schema.required) ? schema.required : []);
    for (const [key, child] of Object.entries(schema.properties)) {
      if (required.has(key) && isPlainObject(child) && nonNullForm(child)) {
        out.push({ owner: schema, key });
      }
    }
  }
  for (const child of childSchemas(schema)) demotionCandidates(child, out);
}

function restoreWith(schema: unknown, value: unknown, demotions: Demotions): unknown {
  if (!isPlainObject(schema)) return value;
  if (Array.isArray(value)) {
    if (schema.items !== undefined) {
      return value.map((item) => restoreWith(schema.items, item, demotions));
    }
    return value;
  }
  if (!isPlainObject(value) || !isPlainObject(schema.properties)) return value;
  const demoted = demotions.get(schema.properties);
  const next: Record<string, unknown> = { ...value };
  for (const [key, child] of Object.entries(schema.properties)) {
    if (!(key in next)) {
      if (demoted?.has(key)) next[key] = null;
      continue;
    }
    if (next[key] !== null) next[key] = restoreWith(child, next[key], demotions);
  }
  return next;
}

/**
 * Fit a model-facing schema into a provider's strict-schema budget.
 * Returns the input unchanged when no limits apply or the schema already fits.
 * When demotion cannot bring the schema under both limits, the remaining
 * overflow is left for the provider to report.
 */
export function fitSchemaToProviderLimits(
  schema: Record<string, unknown>,
  limits: StructuredOutputSchemaLimits | null
): ProviderSchemaFit {
  const identity: ProviderSchemaFit = { schema, restore: (value) => value };
  if (!limits) return identity;
  const counts = countSchema(schema);
  const overflow = counts.unions - limits.maxUnionParameters;
  if (overflow <= 0) return identity;
  const optionalBudget = limits.maxOptionalParameters - counts.optional;
  if (optionalBudget <= 0) return identity;

  const clone = structuredClone(schema) as Record<string, unknown>;
  const candidates: Array<{ owner: Record<string, unknown>; key: string }> = [];
  demotionCandidates(clone, candidates);
  // Demote from the end so the leading (usually most important) fields keep explicit nulls.
  const chosen = candidates.slice(-Math.min(overflow, optionalBudget, candidates.length));
  if (chosen.length === 0) return identity;

  const demotions: Demotions = new WeakMap();
  // Children before parents: a demoted parent is shallow-copied, so its own
  // `required` edits must already be in place when that copy is taken.
  for (const { owner, key } of chosen.reverse()) {
    const properties = owner.properties as Record<string, unknown>;
    const demotedChild = nonNullForm(properties[key] as Record<string, unknown>)!;
    demotedChild.description =
      typeof demotedChild.description === 'string' && demotedChild.description.trim()
        ? `${demotedChild.description.trim()} ${OMIT_HINT}`
        : OMIT_HINT;
    properties[key] = demotedChild;
    owner.required = (owner.required as string[]).filter((name) => name !== key);
    let set = demotions.get(properties);
    if (!set) {
      set = new Set();
      demotions.set(properties, set);
    }
    set.add(key);
  }
  return { schema: clone, restore: (value) => restoreWith(clone, value, demotions) };
}
