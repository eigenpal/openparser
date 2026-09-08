/**
 * Grounded extraction model-facing schema.
 *
 * Strict structured-output providers compile the JSON Schema into a decoding
 * grammar. Wrapping every leaf as `{ value, source_ids }` roughly doubles the
 * grammar and blows up on moderately nested schemas ("compiled grammar is too
 * large"). The model-facing shape is therefore a flat envelope:
 *
 *   { values: <provider-safe caller schema>, fields: [{ path, source_ids,
 *     reason, quote, transform_claim }] }
 *
 * Everything the model says *about* a leaf lives in one record per leaf, so a
 * leaf's path is stated once no matter how many kinds of provenance we ask for.
 * The array is named `fields` because each entry becomes one
 * `grounding.fields[]` record in the public terminal output; `values` stays
 * byte-identical to the caller schema.
 */

import {
  TRANSFORM_OPERATIONS,
  TransformIntentSchema,
  dateTimeFormatIssue,
  formatOnlyDateTimeParameters,
  transformValidatorDescriptor,
  trustedIntentParametersFitProof,
  type TransformIntent,
} from '@openparser/lineage/openparser';

const SOURCE_IDS = 'source_ids';
const VALUES_KEY = 'values';
const FIELDS_KEY = 'fields';
const REASON_KEY = 'reason';
const QUOTE_KEY = 'quote';
const TRANSFORM_CLAIM_KEY = 'transform_claim';
const TRANSFORM_EXTENSION_KEY = 'x-openparser-transform';

const UNSUPPORTED_KEYS = new Set([
  '$defs',
  '$ref',
  '$dynamicRef',
  'definitions',
  'oneOf',
  'anyOf',
  'allOf',
  'not',
  'if',
  'then',
  'else',
  'patternProperties',
  'additionalProperties',
  'unevaluatedProperties',
  'unevaluatedItems',
  'dependentSchemas',
  'dependentRequired',
  'prefixItems',
  'contains',
  'propertyNames',
]);

const ANNOTATION_KEYS = new Set([
  '$comment',
  '$id',
  '$schema',
  'default',
  'deprecated',
  'description',
  'examples',
  'readOnly',
  'title',
  'writeOnly',
]);

const OBJECT_KEYS = new Set([
  ...ANNOTATION_KEYS,
  'type',
  'properties',
  'required',
  'additionalProperties',
  'minProperties',
  'maxProperties',
]);

const ARRAY_KEYS = new Set([
  ...ANNOTATION_KEYS,
  'type',
  'items',
  'minItems',
  'maxItems',
  'uniqueItems',
]);

const LEAF_KEYS = new Set([
  ...ANNOTATION_KEYS,
  'type',
  'enum',
  'const',
  'format',
  'pattern',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  TRANSFORM_EXTENSION_KEY,
]);

type TransformPlanTrieNode = {
  children: Map<string, TransformPlanTrieNode>;
  wildcard?: TransformPlanTrieNode;
  intent?: TransformIntent;
  format?: 'date' | 'date-time' | 'time';
};

export type CompiledTransformPlan = {
  byPointer: Record<string, TransformIntent>;
  outputFormats: Record<string, 'date' | 'date-time' | 'time'>;
  trie: TransformPlanTrieNode;
};

function createTrieNode(): TransformPlanTrieNode {
  return { children: new Map() };
}

export function emptyCompiledTransformPlan(): CompiledTransformPlan {
  return { byPointer: {}, outputFormats: {}, trie: createTrieNode() };
}

function trieChild(
  node: TransformPlanTrieNode,
  segment: string,
  wildcard: boolean
): TransformPlanTrieNode {
  if (wildcard) {
    node.wildcard ??= createTrieNode();
    return node.wildcard;
  }
  let child = node.children.get(segment);
  if (!child) {
    child = createTrieNode();
    node.children.set(segment, child);
  }
  return child;
}

function pointerSegments(pointer: string): string[] {
  return pointer === '' ? [] : pointer.split('/').slice(1);
}

function lookupTrie(
  node: TransformPlanTrieNode,
  segments: string[]
): TransformPlanTrieNode | undefined {
  if (segments.length === 0) return node;
  const [head, ...rest] = segments;
  const literal = node.children.get(head!);
  if (literal) {
    const found = lookupTrie(literal, rest);
    if (found) return found;
  }
  if (node.wildcard) return lookupTrie(node.wildcard, rest);
  return undefined;
}

function formatOnlyIntent(format: 'date' | 'date-time' | 'time'): TransformIntent {
  return {
    operation: 'date_time_format',
    parameters: formatOnlyDateTimeParameters(format),
  };
}

export class GroundingUnsupportedSchemaError extends Error {
  readonly code = 'grounding_unsupported_schema' as const;
  constructor(readonly reason: string) {
    super(`grounding schema unsupported: ${reason}`);
    this.name = 'GroundingUnsupportedSchemaError';
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

function isLeafSchema(schema: Record<string, unknown>): boolean {
  const types = typeList(schema);
  if (types.length === 0) {
    return Array.isArray(schema.enum) || 'const' in schema;
  }
  const nonNull = types.filter((t) => t !== 'null');
  if (nonNull.length === 0) return true;
  if (nonNull.length > 1) return false;
  return ['string', 'number', 'integer', 'boolean'].includes(nonNull[0]!);
}

function assertNoUnsupportedKeys(schema: Record<string, unknown>, path: string): void {
  for (const key of Object.keys(schema)) {
    if (UNSUPPORTED_KEYS.has(key)) {
      // additionalProperties: false is required for strict structured outputs and is fine.
      if (key === 'additionalProperties' && schema.additionalProperties === false) continue;
      throw new GroundingUnsupportedSchemaError(`${path}: unsupported keyword ${key}`);
    }
  }
}

function assertOnlyKeys(
  schema: Record<string, unknown>,
  supported: ReadonlySet<string>,
  path: string
): void {
  for (const key of Object.keys(schema)) {
    if (!supported.has(key)) {
      throw new GroundingUnsupportedSchemaError(`${path}: unsupported keyword ${key}`);
    }
  }
}

/**
 * Walk the caller schema and reject constructs that make dotted JSON paths
 * ambiguous or that we cannot safely pass through under field grounding.
 * Leaves and containers are otherwise preserved verbatim inside `values`.
 */
function assertPathSafeSchema(schema: unknown, path: string): void {
  if (!isPlainObject(schema)) {
    throw new GroundingUnsupportedSchemaError(`${path}: schema must be an object`);
  }
  assertNoUnsupportedKeys(schema, path);

  const types = typeList(schema);
  if (types.includes('object') || (types.length === 0 && isPlainObject(schema.properties))) {
    if (types.length > 1 && !(types.length === 2 && types.includes('null'))) {
      // Nullable object containers are allowed (pass-through); other unions are not.
      if (!(types.includes('object') && types.includes('null') && types.length === 2)) {
        throw new GroundingUnsupportedSchemaError(
          `${path}: union object schemas cannot be grounded safely`
        );
      }
    }
    assertOnlyKeys(schema, OBJECT_KEYS, path);
    const properties = schema.properties;
    if (!isPlainObject(properties) || Object.keys(properties).length === 0) {
      throw new GroundingUnsupportedSchemaError(
        `${path}: object schemas require explicit properties`
      );
    }
    if (schema.additionalProperties !== false) {
      throw new GroundingUnsupportedSchemaError(
        `${path}: object schemas require additionalProperties: false`
      );
    }
    if (
      'required' in schema &&
      (!Array.isArray(schema.required) ||
        schema.required.some(
          (key) => typeof key !== 'string' || !Object.prototype.hasOwnProperty.call(properties, key)
        ))
    ) {
      throw new GroundingUnsupportedSchemaError(
        `${path}: required must contain only declared property names`
      );
    }
    for (const [key, child] of Object.entries(properties)) {
      if (key.length === 0 || key.includes('.')) {
        throw new GroundingUnsupportedSchemaError(
          `${path}: property names must be non-empty and cannot contain dots`
        );
      }
      assertPathSafeSchema(child, `${path}.${key}`);
    }
    return;
  }

  if (types.includes('array')) {
    if (
      types.length > 1 &&
      !(types.includes('array') && types.includes('null') && types.length === 2)
    ) {
      throw new GroundingUnsupportedSchemaError(
        `${path}: union array schemas cannot be grounded safely`
      );
    }
    assertOnlyKeys(schema, ARRAY_KEYS, path);
    if (!('items' in schema)) {
      throw new GroundingUnsupportedSchemaError(`${path}: array schemas require items`);
    }
    assertPathSafeSchema(schema.items, `${path}[]`);
    return;
  }

  if (isLeafSchema(schema)) {
    assertOnlyKeys(schema, LEAF_KEYS, path);
    return;
  }

  throw new GroundingUnsupportedSchemaError(
    `${path}: unsupported schema shape for field grounding`
  );
}

function pointerSegment(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function formatTarget(format: 'date' | 'date-time' | 'time'): string {
  switch (format) {
    case 'date':
      return 'yyyy-MM-dd';
    case 'date-time':
      return "yyyy-MM-dd'T'HH:mm:ssZZ";
    case 'time':
      return 'HH:mm:ssZZ';
  }
}

/**
 * Compile trusted transform intent before provider metadata is stripped.
 * Array members use `*` pointer segments, resolved against concrete indices later.
 */
export function compileTransformPlan(schema: Record<string, unknown>): CompiledTransformPlan {
  const plan: CompiledTransformPlan = emptyCompiledTransformPlan();

  const walk = (node: unknown, trieNode: TransformPlanTrieNode, segments: string[]): void => {
    if (!isPlainObject(node)) return;
    const pointer = segments.length ? `/${segments.join('/')}` : '';
    const format =
      node.format === 'date' || node.format === 'date-time' || node.format === 'time'
        ? node.format
        : undefined;
    if (format) {
      plan.outputFormats[pointer] = format;
      trieNode.format = format;
    }

    const extension = node[TRANSFORM_EXTENSION_KEY];
    if (extension !== undefined) {
      const candidate = structuredClone(extension) as Record<string, unknown>;
      if (
        isPlainObject(candidate) &&
        isPlainObject(candidate.parameters) &&
        'sourceCatalog' in candidate.parameters
      ) {
        throw new GroundingUnsupportedSchemaError(
          `${pointer || '$'}: ${TRANSFORM_EXTENSION_KEY} sourceCatalog is reserved for built-in format-only policy`
        );
      }
      if (
        isPlainObject(candidate) &&
        candidate.operation === 'date_time_format' &&
        isPlainObject(candidate.parameters) &&
        format
      ) {
        const target = formatTarget(format);
        if (candidate.parameters.kind !== undefined && candidate.parameters.kind !== format) {
          throw new GroundingUnsupportedSchemaError(
            `${pointer || '$'}: ${TRANSFORM_EXTENSION_KEY} kind conflicts with format: ${format}`
          );
        }
        if (
          candidate.parameters.targetFormat !== undefined &&
          candidate.parameters.targetFormat !== target
        ) {
          throw new GroundingUnsupportedSchemaError(
            `${pointer || '$'}: ${TRANSFORM_EXTENSION_KEY} targetFormat conflicts with format: ${format}`
          );
        }
        candidate.parameters.targetFormat = target;
        candidate.parameters.kind = format;
      }
      const parsed = TransformIntentSchema.safeParse(candidate);
      if (!parsed.success) {
        throw new GroundingUnsupportedSchemaError(
          `${pointer || '$'}: invalid ${TRANSFORM_EXTENSION_KEY}: ${zodIssues(parsed.error)}`
        );
      }
      if (!trustedIntentParametersFitProof(parsed.data.parameters)) {
        throw new GroundingUnsupportedSchemaError(
          `${pointer || '$'}: ${TRANSFORM_EXTENSION_KEY} trusted parameters exceed the proof budget`
        );
      }
      if (parsed.data.operation === 'date_time_format') {
        if (parsed.data.parameters.sourceFormats.length === 0) {
          throw new GroundingUnsupportedSchemaError(
            `${pointer || '$'}: ${TRANSFORM_EXTENSION_KEY} date_time_format requires sourceFormats`
          );
        }
        const issue = dateTimeFormatIssue(
          parsed.data.parameters.kind,
          parsed.data.parameters.sourceFormats,
          parsed.data.parameters.targetFormat
        );
        if (issue) {
          throw new GroundingUnsupportedSchemaError(
            `${pointer || '$'}: ${TRANSFORM_EXTENSION_KEY} ${issue}`
          );
        }
      }
      const descriptor = transformValidatorDescriptor(parsed.data.operation);
      const outputTypes = typeList(node).filter((type) => type !== 'null');
      if (
        outputTypes.length > 0 &&
        !outputTypes.every((type) => descriptor.acceptedOutputTypes.includes(type))
      ) {
        throw new GroundingUnsupportedSchemaError(
          `${pointer || '$'}: ${TRANSFORM_EXTENSION_KEY} operation ${parsed.data.operation} does not accept output type ${outputTypes.join(' | ')}`
        );
      }
      plan.byPointer[pointer] = parsed.data;
      trieNode.intent = parsed.data;
    }

    if (isPlainObject(node.properties)) {
      for (const [key, child] of Object.entries(node.properties)) {
        const segment = pointerSegment(key);
        walk(child, trieChild(trieNode, segment, false), [...segments, segment]);
      }
    }
    if (node.items !== undefined) {
      walk(node.items, trieChild(trieNode, '*', true), [...segments, '*']);
    }
  };
  walk(schema, plan.trie, []);
  return plan;
}

function zodIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues
    .slice(0, 4)
    .map((issue) => `${issue.path.map(String).join('.') || 'value'}: ${issue.message}`)
    .join('; ');
}

/** Resolve an exact pointer by walking compiled schema shape, not every numeric token. */
export function transformIntentForPointer(
  plan: CompiledTransformPlan,
  pointer: string
): TransformIntent | undefined {
  const exact = plan.byPointer[pointer];
  if (exact) return exact;
  const node = lookupTrie(plan.trie, pointerSegments(pointer));
  if (!node) return undefined;
  if (node.intent) return node.intent;
  if (node.format) return formatOnlyIntent(node.format);
  return undefined;
}

function stripProviderExtensions(node: unknown): void {
  if (!isPlainObject(node)) return;
  delete node[TRANSFORM_EXTENSION_KEY];
  if (isPlainObject(node.properties)) {
    Object.values(node.properties).forEach(stripProviderExtensions);
  }
  if (node.items !== undefined) stripProviderExtensions(node.items);
}

/** Clone a caller schema and remove OpenParser-only metadata before provider dispatch. */
export function providerSafeExtractionSchema(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const clone = structuredClone(schema) as Record<string, unknown>;
  stripProviderExtensions(clone);
  return clone;
}

function leafPathSchema(): Record<string, unknown> {
  return {
    type: 'string',
    description:
      'Dot-separated JSON path of a leaf in values. Array indices are decimal segments, e.g. line_items.0.amount.',
  };
}

/**
 * One record per extracted leaf. Every property is in `required`: strict
 * providers reject a property that is declared but optional, and that rejection
 * arrives as an HTTP 400 for the whole extraction. Absence is expressed as an
 * empty string / empty array, never as a missing key.
 */
function fieldEntrySchema(): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      path: leafPathSchema(),
      [SOURCE_IDS]: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Exact source ids from the document (block ids like b0). Empty only when the value is genuinely absent.',
      },
      [REASON_KEY]: {
        type: 'string',
        description:
          'One or two sentences explaining why this quote is the source for this leaf: what in the document identifies it. Do not explain formatting here. Empty only when the value is genuinely absent.',
      },
      [QUOTE_KEY]: {
        type: 'string',
        description:
          'The exact span of document text this value came from, copied character for character. Empty only when the value is genuinely absent.',
      },
      [TRANSFORM_CLAIM_KEY]: {
        type: 'object',
        description:
          'Untrusted model report about a rewrite. Claims never authorize a validator, change target format, locale, zone, or unit/currency policy, or add source formats. For format-only JSON Schema dates, source_format may only prioritize a member of the trusted built-in catalog.',
        properties: {
          operation: {
            type: 'string',
            enum: ['', ...TRANSFORM_OPERATIONS],
          },
          parameters: {
            type: 'object',
            properties: {
              source_format: { type: 'string', maxLength: 128 },
              target_format: { type: 'string', maxLength: 128 },
              source_unit: { type: 'string', maxLength: 32 },
              target_unit: { type: 'string', maxLength: 32 },
              token: { type: 'string', maxLength: 64 },
              locale: { type: 'string', maxLength: 64 },
            },
            required: [
              'source_format',
              'target_format',
              'source_unit',
              'target_unit',
              'token',
              'locale',
            ],
            additionalProperties: false,
            description:
              'Bounded strings describing what the model says it did. Use empty strings for parameters that do not apply.',
          },
          reason: {
            type: 'string',
            description: 'How the quote became the value. Empty whenever the value is verbatim.',
          },
          confidence: {
            type: 'string',
            enum: ['', 'low', 'medium', 'high'],
            description:
              'Coarse ordinal self-report. It is not a probability and cannot prove a transform.',
          },
        },
        required: ['operation', 'parameters', 'reason', 'confidence'],
        additionalProperties: false,
      },
    },
    required: ['path', SOURCE_IDS, REASON_KEY, QUOTE_KEY, TRANSFORM_CLAIM_KEY],
    additionalProperties: false,
  };
}

/**
 * Transform a caller schema into the compact model-facing grounded envelope.
 * Throws {@link GroundingUnsupportedSchemaError} when transformation would change semantics.
 */
export function transformSchemaForGrounding(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const rootTypes = typeList(schema);
  const isObjectRoot =
    (rootTypes.length === 1 && rootTypes[0] === 'object') ||
    (rootTypes.length === 0 && isPlainObject(schema.properties));
  if (!isObjectRoot) {
    throw new GroundingUnsupportedSchemaError('$: field grounding requires an object root schema');
  }
  assertPathSafeSchema(schema, '$');
  compileTransformPlan(schema);

  // Deep-clone so mutation of the admission/job schema cannot affect the model call.
  const valuesSchema = providerSafeExtractionSchema(schema);

  return {
    type: 'object',
    description:
      'Extracted values matching the caller schema, plus one flat provenance record per leaf.',
    properties: {
      [VALUES_KEY]: valuesSchema,
      [FIELDS_KEY]: {
        type: 'array',
        description:
          'One entry per extracted leaf in values. Paths use dotted segments and 0-based array indices.',
        items: fieldEntrySchema(),
      },
    },
    // Strict structured-output providers reject properties that are not in
    // `required`. `fields` is therefore mandatory on this envelope, not optional.
    required: [VALUES_KEY, FIELDS_KEY],
    additionalProperties: false,
  };
}

/**
 * The same envelope, with the narrative fields no longer mandatory.
 *
 * The request has to demand every property, because a strict provider rejects
 * one that is declared and optional. Judging the *response* that way turns a
 * provider that simply left out a sentence into a failed extraction, even though
 * every extracted value is valid — and unwrapping already degrades a field with
 * missing provenance rather than failing. So the wire contract stays strict and
 * the response is held to what actually matters: which leaf this record is about.
 */
export function relaxGroundingNarrative(
  envelope: Record<string, unknown>
): Record<string, unknown> {
  const relaxed = structuredClone(envelope) as Record<string, unknown>;
  const fields = (relaxed.properties as Record<string, unknown> | undefined)?.[FIELDS_KEY];
  const entry = isPlainObject(fields) ? (fields as Record<string, unknown>).items : undefined;
  if (isPlainObject(entry)) {
    const narrative: string[] = [REASON_KEY, QUOTE_KEY, TRANSFORM_CLAIM_KEY];
    const required = (entry as Record<string, unknown>).required;
    if (Array.isArray(required)) {
      (entry as Record<string, unknown>).required = required.filter(
        (name) => typeof name === 'string' && !narrative.includes(name)
      );
    }
  }
  return relaxed;
}

/**
 * Legacy leaf-wrapper transform retained only for local grammar-size benchmarks.
 * Not used by runtime extraction.
 */
export function transformSchemaForGroundingLeafWrapped(
  schema: Record<string, unknown>
): Record<string, unknown> {
  assertPathSafeSchema(schema, '$');
  return wrapLeaves(structuredClone(schema) as Record<string, unknown>, '$');
}

function wrapLeaves(schema: Record<string, unknown>, path: string): Record<string, unknown> {
  const types = typeList(schema);
  if (types.includes('object') || (types.length === 0 && isPlainObject(schema.properties))) {
    const properties = schema.properties as Record<string, unknown>;
    const nextProps: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(properties)) {
      nextProps[key] = wrapLeaves(child as Record<string, unknown>, `${path}.${key}`);
    }
    return { ...schema, type: 'object', properties: nextProps, additionalProperties: false };
  }
  if (types.includes('array')) {
    return {
      ...schema,
      type: 'array',
      items: wrapLeaves(schema.items as Record<string, unknown>, `${path}[]`),
    };
  }
  const leaf = { ...schema };
  delete leaf.description;
  return {
    type: 'object',
    ...(typeof schema.description === 'string' ? { description: schema.description } : {}),
    properties: {
      value: leaf,
      [SOURCE_IDS]: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Exact source ids from the document (block ids like b0). Empty only when the value is genuinely absent.',
      },
    },
    required: ['value', SOURCE_IDS],
    additionalProperties: false,
  };
}

/** Admission-time check: transform must succeed before a grounded job is accepted. */
export function assertGroundingSchemaSupported(schema: Record<string, unknown>): void {
  transformSchemaForGrounding(schema);
}

export const GROUNDING_SOURCE_IDS_KEY = SOURCE_IDS;
export const GROUNDING_VALUES_KEY = VALUES_KEY;
export const GROUNDING_FIELDS_KEY = FIELDS_KEY;
export const GROUNDING_REASON_KEY = REASON_KEY;
export const GROUNDING_QUOTE_KEY = QUOTE_KEY;
export const GROUNDING_TRANSFORM_CLAIM_KEY = TRANSFORM_CLAIM_KEY;
export const OPENPARSER_TRANSFORM_EXTENSION_KEY = TRANSFORM_EXTENSION_KEY;
