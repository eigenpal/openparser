import Decimal from 'decimal.js';
import { DateTime } from 'luxon';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { JsonValueSchema, type JsonValue } from '../common';

export const TRANSFORM_VERIFICATION_DOCS =
  'https://docs.openparser.dev/lineage/openparser/transform-verification';
export const TRANSFORM_PROOF_ATTRIBUTE = 'openparser:transformProof';
export const MAX_TRANSFORM_PROOF_BYTES = 2_048;
/** Admission budget so a newly accepted policy can always serialize inside a 2 KiB proof. */
export const MAX_TRANSFORM_INTENT_PARAMETER_BYTES = 1_024;

export const TRANSFORM_DOCS_ANCHORS = [
  'date-time-format',
  'numeric-format',
  'quantity-magnitude',
  'unit-conversion',
  'currency-code',
  'boolean-alias',
  'text-normalization',
  'enum-alias',
] as const;
export type TransformDocsAnchor = (typeof TRANSFORM_DOCS_ANCHORS)[number];

export const TransformProofClassSchema = z.enum([
  'safe_equivalence',
  'exact_conversion',
  'policy_application',
]);
export type TransformProofClass = z.infer<typeof TransformProofClassSchema>;

export type DateTimeKind = 'date' | 'date-time' | 'time';

type FormatComponents = {
  yearQuality: 'none' | 'short' | 'full';
  month: boolean;
  day: boolean;
  hour: boolean;
  minute: boolean;
  second: boolean;
  millisecond: boolean;
  offset: boolean;
  zone: boolean;
};

const FORMAT_TOKENS = (
  [
    ['yyyyy', 'year', 'full'],
    ['yyyy', 'year', 'full'],
    ['yyy', 'year', 'short'],
    ['yy', 'year', 'short'],
    ['y', 'year', 'short'],
    ['uuuuu', 'year', 'full'],
    ['uuuu', 'year', 'full'],
    ['uuu', 'year', 'short'],
    ['uu', 'year', 'short'],
    ['u', 'year', 'short'],
    ['MMMMM', 'month'],
    ['MMMM', 'month'],
    ['MMM', 'month'],
    ['MM', 'month'],
    ['M', 'month'],
    ['LLLLL', 'month'],
    ['LLLL', 'month'],
    ['LLL', 'month'],
    ['LL', 'month'],
    ['L', 'month'],
    ['dd', 'day'],
    ['d', 'day'],
    ['HH', 'hour'],
    ['H', 'hour'],
    ['hh', 'hour'],
    ['h', 'hour'],
    ['kk', 'hour'],
    ['k', 'hour'],
    ['mm', 'minute'],
    ['m', 'minute'],
    ['ss', 'second'],
    ['s', 'second'],
    ['SSS', 'millisecond'],
    ['SS', 'millisecond'],
    ['S', 'millisecond'],
    ['ZZZZZ', 'offset'],
    ['ZZZZ', 'offset'],
    ['ZZZ', 'offset'],
    ['ZZ', 'offset'],
    ['Z', 'offset'],
    ['zzz', 'zone'],
    ['zz', 'zone'],
    ['z', 'zone'],
  ] as const
).toSorted((left, right) => right[0].length - left[0].length);

function unquotedFormatChunks(format: string): string[] {
  const chunks: string[] = [];
  let i = 0;
  let current = '';
  while (i < format.length) {
    if (format[i] === "'") {
      if (current) chunks.push(current);
      current = '';
      i += 1;
      while (i < format.length) {
        if (format[i] === "'" && format[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (format[i] === "'") {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    current += format[i];
    i += 1;
  }
  if (current) chunks.push(current);
  return chunks;
}

function inspectFormat(format: string): FormatComponents {
  const components: FormatComponents = {
    yearQuality: 'none',
    month: false,
    day: false,
    hour: false,
    minute: false,
    second: false,
    millisecond: false,
    offset: false,
    zone: false,
  };
  for (const chunk of unquotedFormatChunks(format)) {
    let i = 0;
    while (i < chunk.length) {
      const match = FORMAT_TOKENS.find(([token]) => chunk.startsWith(token, i));
      if (!match) {
        i += 1;
        continue;
      }
      const [, field, yearQuality] = match;
      if (field === 'year') {
        if (yearQuality === 'short' || components.yearQuality === 'short') {
          components.yearQuality = 'short';
        } else {
          components.yearQuality = 'full';
        }
      } else {
        components[field] = true;
      }
      i += match[0].length;
    }
  }
  return components;
}

function formatHasRequiredKindTokens(kind: DateTimeKind, components: FormatComponents): boolean {
  if (components.yearQuality === 'short') return false;
  if (kind === 'date') {
    return (
      components.yearQuality === 'full' &&
      components.month &&
      components.day &&
      !components.hour &&
      !components.minute &&
      !components.second &&
      !components.millisecond &&
      !components.offset &&
      !components.zone
    );
  }
  if (kind === 'time') {
    return (
      components.hour &&
      components.minute &&
      components.second &&
      components.yearQuality === 'none' &&
      !components.month &&
      !components.day
    );
  }
  return (
    components.yearQuality === 'full' &&
    components.month &&
    components.day &&
    components.hour &&
    components.minute &&
    components.second
  );
}

function optionalTimeComponentsAlign(source: FormatComponents, target: FormatComponents): boolean {
  return (
    source.millisecond === target.millisecond &&
    source.offset === target.offset &&
    source.zone === target.zone
  );
}

export function dateTimeFormatIssue(
  kind: DateTimeKind,
  sourceFormats: string[],
  targetFormat: string
): string | undefined {
  const target = inspectFormat(targetFormat);
  if (!formatHasRequiredKindTokens(kind, target)) {
    return 'target format must preserve every required component and must not use a two-digit year';
  }
  for (const format of sourceFormats) {
    const source = inspectFormat(format);
    if (!formatHasRequiredKindTokens(kind, source)) {
      return 'source format must preserve every required component and must not use a two-digit year';
    }
    if (!optionalTimeComponentsAlign(source, target)) {
      return 'source and target formats must not add or drop milliseconds, offset, or zone';
    }
  }
  return undefined;
}

/**
 * Built-in Luxon source formats for format-only JSON Schema `date` / `date-time` /
 * `time` intent. Versioned independently of `openparser.transform.date-time-format.v1`
 * so accepted sources can grow without rewriting already-emitted proofs.
 *
 * v1 selection is conservative and not demo-specific:
 * - ISO 8601 calendar date and the matching offset-bearing ISO date-time/time forms
 * - Unambiguous year-first numeric calendar dates
 * - Explicit English civil date families (day-first and US month-first, full or
 *   abbreviated month names, and "N day of Month Year")
 *
 * Locale-ambiguous numeric day/month orders (`MM/dd/yyyy`, `dd/MM/yyyy`, …),
 * two-digit years, weekday-prefixed forms, and natural-language parsers are
 * omitted. A claim `source_format` may only prioritize a catalog member; it
 * cannot add omitted forms or shrink the candidate set.
 */
export const DATE_SOURCE_CATALOG_ID = 'openparser.transform.date-source-catalog' as const;
export const DATE_SOURCE_CATALOG_VERSION = 1 as const;
export const FORMAT_ONLY_DATE_TARGETS = {
  date: 'yyyy-MM-dd',
  'date-time': "yyyy-MM-dd'T'HH:mm:ssZZ",
  time: 'HH:mm:ssZZ',
} as const;
export const DATE_SOURCE_CATALOG_V1: Record<DateTimeKind, readonly string[]> = {
  date: [
    'yyyy-MM-dd',
    'yyyy/MM/dd',
    'yyyy.MM.dd',
    'd MMMM yyyy',
    'dd MMMM yyyy',
    'MMMM d, yyyy',
    'MMMM dd, yyyy',
    'd MMM yyyy',
    'dd MMM yyyy',
    'MMM d, yyyy',
    'MMM dd, yyyy',
    "d 'day of' MMMM yyyy",
    "dd 'day of' MMMM yyyy",
  ],
  'date-time': ["yyyy-MM-dd'T'HH:mm:ssZZ", "yyyy-MM-dd'T'HH:mm:ssZ"],
  time: ['HH:mm:ssZZ', 'HH:mm:ssZ'],
};

export function trustedDateSourceFormats(
  kind: DateTimeKind,
  targetFormat: string = FORMAT_ONLY_DATE_TARGETS[kind]
): string[] {
  return DATE_SOURCE_CATALOG_V1[kind].filter(
    (format) => dateTimeFormatIssue(kind, [format], targetFormat) === undefined
  );
}

export function formatOnlyDateTimeParameters(kind: DateTimeKind) {
  return {
    kind,
    sourceFormats: trustedDateSourceFormats(kind, FORMAT_ONLY_DATE_TARGETS[kind]),
    targetFormat: FORMAT_ONLY_DATE_TARGETS[kind],
    locale: 'en-US',
    zonePolicy: kind === 'date' ? ('civil' as const) : ('preserve' as const),
    sourceCatalog: {
      id: DATE_SOURCE_CATALOG_ID,
      version: DATE_SOURCE_CATALOG_VERSION,
    },
  };
}

const DateSourceCatalogRefSchema = z
  .object({
    id: z.literal(DATE_SOURCE_CATALOG_ID),
    version: z.literal(DATE_SOURCE_CATALOG_VERSION),
  })
  .strict();

const DateTimeParametersSchema = z
  .object({
    kind: z.enum(['date', 'date-time', 'time']),
    sourceFormats: z.array(z.string().min(1).max(128)).max(16).default([]),
    targetFormat: z.string().min(1).max(128),
    locale: z.string().min(2).max(64).default('en-US'),
    zonePolicy: z.enum(['civil', 'preserve', 'utc', 'named']).default('civil'),
    zone: z.string().min(1).max(128).optional(),
    sourceCatalog: DateSourceCatalogRefSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.zonePolicy === 'named' && !value.zone) {
      ctx.addIssue({ code: 'custom', path: ['zone'], message: 'named zone policy requires zone' });
    }
    if (value.kind === 'date' && value.zonePolicy !== 'civil') {
      ctx.addIssue({
        code: 'custom',
        path: ['zonePolicy'],
        message: 'date-only transforms must remain civil',
      });
    }
    if (/[Zz]/.test(value.targetFormat) && value.zonePolicy === 'civil') {
      ctx.addIssue({
        code: 'custom',
        path: ['zonePolicy'],
        message: 'target formats with an offset require preserve, utc, or named zone policy',
      });
    }
  });

const NumericParametersSchema = z
  .object({
    decimalSeparator: z.enum(['.', ',']).default('.'),
    groupingSeparator: z.enum([',', '.', ' ', '\u00a0']).optional(),
    prefixes: z.array(z.string().max(16)).max(16).default([]),
    suffixes: z.array(z.string().max(16)).max(16).default([]),
    accountingParentheses: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.groupingSeparator === value.decimalSeparator) {
      ctx.addIssue({
        code: 'custom',
        path: ['groupingSeparator'],
        message: 'grouping and decimal separators must differ',
      });
    }
  });

function policyMap<T>(keyMax: number, maxKeys: number, schema: z.ZodType<T>) {
  return z
    .record(z.string().min(1).max(keyMax), schema)
    .refine((value) => Object.keys(value).length <= maxKeys, `at most ${maxKeys} keys`);
}

const QuantityParametersSchema = z
  .object({
    allowedUnits: policyMap(32, 16, z.string().min(1).max(32)),
    targetUnit: z.string().min(1).max(32),
  })
  .strict();

const UnitConversionParametersSchema = z
  .object({
    sourceUnits: z.array(z.string().min(1).max(32)).min(1).max(32),
    targetUnit: z.string().min(1).max(32),
  })
  .strict();

const CurrencyParametersSchema = z
  .object({
    acceptedCodes: z
      .array(z.string().regex(/^[A-Z]{3}$/))
      .min(1)
      .max(64),
    aliases: policyMap(64, 16, z.string().regex(/^[A-Z]{3}$/)).default({}),
    symbolMap: policyMap(8, 16, z.string().regex(/^[A-Z]{3}$/)).default({}),
  })
  .strict();

const BooleanParametersSchema = z
  .object({
    aliases: policyMap(64, 16, z.boolean()),
    caseSensitive: z.boolean().default(false),
  })
  .strict();

const TextNormalizationParametersSchema = z
  .object({
    operations: z
      .array(z.enum(['trim', 'collapse_whitespace', 'lowercase', 'uppercase', 'nfkc']))
      .min(1)
      .max(8),
    locale: z.string().min(2).max(64).default('en-US'),
  })
  .strict();

const EnumAliasParametersSchema = z
  .object({
    aliases: policyMap(256, 16, z.union([z.string().max(256), z.number()])),
    caseSensitive: z.boolean().default(true),
  })
  .strict();

export const TransformIntentSchema = z.discriminatedUnion('operation', [
  z
    .object({ operation: z.literal('date_time_format'), parameters: DateTimeParametersSchema })
    .strict(),
  z
    .object({ operation: z.literal('numeric_format'), parameters: NumericParametersSchema })
    .strict(),
  z
    .object({ operation: z.literal('quantity_magnitude'), parameters: QuantityParametersSchema })
    .strict(),
  z
    .object({ operation: z.literal('unit_conversion'), parameters: UnitConversionParametersSchema })
    .strict(),
  z
    .object({ operation: z.literal('currency_code'), parameters: CurrencyParametersSchema })
    .strict(),
  z.object({ operation: z.literal('boolean_alias'), parameters: BooleanParametersSchema }).strict(),
  z
    .object({
      operation: z.literal('text_normalization'),
      parameters: TextNormalizationParametersSchema,
    })
    .strict(),
  z.object({ operation: z.literal('enum_alias'), parameters: EnumAliasParametersSchema }).strict(),
]);
export type TransformIntent = z.infer<typeof TransformIntentSchema>;
export type TransformOperation = TransformIntent['operation'];

export const TRANSFORM_OPERATIONS = [
  'date_time_format',
  'numeric_format',
  'quantity_magnitude',
  'unit_conversion',
  'currency_code',
  'boolean_alias',
  'text_normalization',
  'enum_alias',
] as const satisfies readonly TransformOperation[];

export const TransformClaimSchema = z
  .object({
    operation: z.enum(['', ...TRANSFORM_OPERATIONS]),
    parameters: z
      .record(z.string().max(64), z.union([z.string().max(128), z.number(), z.boolean()]))
      .refine((value) => Object.keys(value).length <= 16, 'at most 16 claim parameters')
      .default({}),
    reason: z.string().max(2_000),
    confidence: z.enum(['', 'low', 'medium', 'high']),
  })
  .strict();
export type TransformClaim = z.infer<typeof TransformClaimSchema>;

export const TRANSFORM_PROOF_OPERAND_KEYS = [
  'bounded',
  'canonical',
  'magnitude',
  'mappedValue',
  'matchedSourceFormat',
  'output',
  'outputCode',
  'outputDecimal',
  'outputHash',
  'policyHash',
  'resolvedCode',
  'sourceDecimal',
  'sourceHash',
  'sourceMagnitude',
  'sourceUnit',
  'targetMagnitude',
  'targetUnit',
] as const;

function sanitizeProofOperands(
  value: unknown
): Record<string, z.infer<typeof TransformProofOperandValueSchema>> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const next = Object.fromEntries(
    Object.entries(value).filter(([key]) =>
      (TRANSFORM_PROOF_OPERAND_KEYS as readonly string[]).includes(key)
    )
  );
  return Object.keys(next).length ? next : undefined;
}

export const TransformProofHashSchema = z
  .object({
    algorithm: z.literal('sha256'),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const TransformProofOperandValueSchema = z.union([
  z.string().max(128),
  z.number().finite(),
  z.boolean(),
  TransformProofHashSchema,
]);

function recordSize<T>(maxKeys: number, schema: z.ZodType<T>) {
  return z
    .record(z.string().min(1).max(64), schema)
    .refine((value) => Object.keys(value).length <= maxKeys, `at most ${maxKeys} keys`);
}

export function isTrustedTransformDocsHref(href: string): boolean {
  if (href === TRANSFORM_VERIFICATION_DOCS) return true;
  const prefix = `${TRANSFORM_VERIFICATION_DOCS}#`;
  if (!href.startsWith(prefix)) return false;
  const anchor = href.slice(prefix.length);
  return (TRANSFORM_DOCS_ANCHORS as readonly string[]).includes(anchor);
}

export function trustedTransformDocsHref(methodId?: string): string {
  if (!methodId) return TRANSFORM_VERIFICATION_DOCS;
  const descriptor = TRANSFORM_VALIDATORS.find((entry) => entry.methodId === methodId);
  return descriptor
    ? `${TRANSFORM_VERIFICATION_DOCS}#${descriptor.docsAnchor}`
    : TRANSFORM_VERIFICATION_DOCS;
}

const proofByteLength = (input: unknown) =>
  new TextEncoder().encode(JSON.stringify(input)).byteLength;

export function trustedIntentParametersFitProof(parameters: unknown): boolean {
  return proofByteLength(parameters) <= MAX_TRANSFORM_INTENT_PARAMETER_BYTES;
}

export const TransformProofSchema = z
  .object({
    methodId: z.string().min(1).max(128),
    methodVersion: z.number().int().positive(),
    result: z.enum(['verified', 'contradicted', 'not_applicable']),
    proofClass: TransformProofClassSchema,
    scope: z.string().min(1).max(256),
    trustedParameters: recordSize(32, JsonValueSchema),
    operands: recordSize(16, TransformProofOperandValueSchema)
      .refine(
        (value) =>
          Object.keys(value).every((key) =>
            (TRANSFORM_PROOF_OPERAND_KEYS as readonly string[]).includes(key)
          ),
        'unsupported proof operand key'
      )
      .optional(),
    checks: recordSize(32, z.boolean()),
    implementation: z
      .object({
        library: z.string().min(1).max(128),
        version: z.string().min(1).max(64),
        runtime: z.string().min(1).max(128).optional(),
        locale: z.string().min(1).max(64).optional(),
        zone: z.string().min(1).max(128).optional(),
      })
      .strict(),
    limitations: z.string().min(1).max(512),
    docsHref: z
      .string()
      .max(256)
      .refine(isTrustedTransformDocsHref, 'untrusted transform docs href'),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (proofByteLength(value) > MAX_TRANSFORM_PROOF_BYTES) {
      ctx.addIssue({
        code: 'custom',
        message: `transform proof exceeds ${MAX_TRANSFORM_PROOF_BYTES} bytes`,
      });
    }
  });
export type TransformProof = z.infer<typeof TransformProofSchema>;

export function parseTransformProof(value: unknown): TransformProof | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const methodId = typeof record.methodId === 'string' ? record.methodId : undefined;
  const candidate = {
    methodId: record.methodId,
    methodVersion: record.methodVersion,
    result: record.result,
    proofClass: record.proofClass,
    scope: record.scope,
    trustedParameters: record.trustedParameters,
    ...(sanitizeProofOperands(record.operands)
      ? { operands: sanitizeProofOperands(record.operands) }
      : {}),
    checks: record.checks,
    implementation: record.implementation,
    limitations: record.limitations,
    docsHref: trustedTransformDocsHref(methodId),
  };
  const parsed = TransformProofSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

export type TransformVerificationResult = {
  result: TransformProof['result'];
  proof: TransformProof;
};

export type TransformValidatorDescriptor = {
  operation: TransformOperation;
  methodId: string;
  version: number;
  label: string;
  summary: string;
  docsAnchor: TransformDocsAnchor;
  acceptedSourceTypes: readonly string[];
  acceptedOutputTypes: readonly string[];
  proofClass: TransformProofClass;
  parameterSchema: z.ZodType;
  parameterJsonSchema: Record<string, unknown>;
  library: { name: string; version: string };
  limitations: string;
  verify(input: {
    quote: string;
    output: unknown;
    parameters: unknown;
    preferredSourceFormat?: string;
  }): TransformVerificationResult;
};

const DECIMAL_VERSION = '10.6.0';
const LUXON_VERSION = '3.7.2';
const ISO_4217_CODES = new Set(
  'AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BOV BRL BSD BTN BWP BYN BZD CAD CDF CHE CHF CHW CLF CLP CNY COP COU CRC CUC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HRK HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MXV MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD USN UYI UYU UYW UZS VED VES VND VUV WST XAF XAG XAU XBA XBB XBC XBD XCD XDR XOF XPD XPF XPT XSU XTS XUA XXX YER ZAR ZMW ZWG ZWL'.split(
    ' '
  )
);

function descriptorBase(
  input: Omit<TransformValidatorDescriptor, 'verify' | 'parameterJsonSchema'> & {
    parameterJsonSchema?: Record<string, unknown>;
  }
): Omit<TransformValidatorDescriptor, 'verify'> {
  return {
    ...input,
    parameterJsonSchema: input.parameterJsonSchema ?? z.toJSONSchema(input.parameterSchema),
  };
}

function sha256Operand(value: string): { algorithm: 'sha256'; digest: string } {
  return {
    algorithm: 'sha256',
    digest: createHash('sha256').update(value, 'utf8').digest('hex'),
  };
}

function boundedOperand(value: string): string | { algorithm: 'sha256'; digest: string } {
  return value.length <= 128 ? value : sha256Operand(value);
}

function proof(
  descriptor: Omit<TransformValidatorDescriptor, 'verify'>,
  result: TransformProof['result'],
  parameters: Record<string, unknown>,
  extras: Pick<TransformProof, 'checks'> &
    Partial<Pick<TransformProof, 'operands'>> & {
      runtime?: string;
      locale?: string;
      zone?: string;
      proofClass?: TransformProofClass;
    }
): TransformVerificationResult {
  const jsonParameters = JSON.parse(JSON.stringify(parameters)) as Record<string, JsonValue>;
  const jsonOperands = extras.operands
    ? (JSON.parse(JSON.stringify(extras.operands)) as TransformProof['operands'])
    : undefined;
  const value = {
    methodId: descriptor.methodId,
    methodVersion: descriptor.version,
    result,
    proofClass: extras.proofClass ?? descriptor.proofClass,
    scope: descriptor.summary,
    trustedParameters: jsonParameters,
    ...(jsonOperands ? { operands: jsonOperands } : {}),
    checks: extras.checks,
    implementation: {
      library: descriptor.library.name,
      version: descriptor.library.version,
      ...(extras.runtime ? { runtime: extras.runtime.slice(0, 128) } : {}),
      ...(extras.locale ? { locale: extras.locale } : {}),
      ...(extras.zone ? { zone: extras.zone } : {}),
    },
    limitations: descriptor.limitations,
    docsHref: `${TRANSFORM_VERIFICATION_DOCS}#${descriptor.docsAnchor}`,
  };
  const next = boundedProof(value);
  return { result: next.result, proof: next };
}

function isIncompleteTrustedPolicy(parameters: unknown): boolean {
  return (
    typeof parameters === 'object' &&
    parameters !== null &&
    !Array.isArray(parameters) &&
    Object.keys(parameters).length === 1 &&
    (parameters as { bounded?: unknown }).bounded === true
  );
}

function downgradeProofTooLarge(value: Record<string, unknown>): TransformProof {
  const digest = sha256Operand(JSON.stringify(value.trustedParameters ?? {}));
  const parsed = TransformProofSchema.safeParse({
    methodId: value.methodId,
    methodVersion: value.methodVersion,
    result: 'not_applicable',
    proofClass: value.proofClass,
    scope: value.scope,
    trustedParameters: {
      reason: 'proof_too_large',
      policyHash: digest,
    },
    operands: { policyHash: digest },
    checks: { proofFitsBound: false },
    implementation: value.implementation,
    limitations: value.limitations,
    docsHref: value.docsHref,
  });
  if (!parsed.success) {
    throw new Error('transform proof descriptor exceeds bounded metadata limit');
  }
  return parsed.data;
}

function boundedProof(value: unknown): TransformProof {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('transform proof descriptor exceeds bounded metadata limit');
  }
  const record = value as Record<string, unknown>;
  const parsed = TransformProofSchema.safeParse(value);
  if (parsed.success) {
    if (
      parsed.data.result === 'verified' &&
      isIncompleteTrustedPolicy(parsed.data.trustedParameters)
    ) {
      return downgradeProofTooLarge(record);
    }
    return parsed.data;
  }
  return downgradeProofTooLarge(record);
}

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function outputDecimal(value: unknown): Decimal | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return new Decimal(value.toString());
  if (typeof value === 'string' && /^[+-]?\d+(?:\.\d+)?$/.test(value)) return new Decimal(value);
  return undefined;
}

function parseTrustedDecimal(
  quote: string,
  parameters: z.infer<typeof NumericParametersSchema>
): Decimal | undefined {
  let text = quote.normalize('NFKC').trim();
  let negative = false;
  if (parameters.accountingParentheses && text.startsWith('(') && text.endsWith(')')) {
    negative = true;
    text = text.slice(1, -1).trim();
  }
  const stripEdge = (values: string[], edge: 'prefix' | 'suffix') => {
    const match = [...values]
      .sort((a, b) => b.length - a.length)
      .find((value) => (edge === 'prefix' ? text.startsWith(value) : text.endsWith(value)));
    if (!match) return;
    text =
      edge === 'prefix'
        ? text.slice(match.length).trim()
        : text.slice(0, text.length - match.length).trim();
  };
  stripEdge(parameters.prefixes, 'prefix');
  stripEdge(parameters.suffixes, 'suffix');
  const decimal = escaped(parameters.decimalSeparator);
  const grouping = parameters.groupingSeparator ? escaped(parameters.groupingSeparator) : undefined;
  const integer = grouping ? `(?:\\d{1,3}(?:${grouping}\\d{3})+|\\d+)` : '\\d+';
  if (!new RegExp(`^[+-]?${integer}(?:${decimal}\\d+)?$`).test(text)) return undefined;
  const canonical = text
    .replaceAll(parameters.groupingSeparator ?? '\u0000', '')
    .replace(parameters.decimalSeparator, '.');
  try {
    const parsed = new Decimal(canonical);
    return negative ? parsed.negated() : parsed;
  } catch {
    return undefined;
  }
}

function dateTimeRuntime(): string | undefined {
  if (typeof process === 'undefined') return undefined;
  return `node ${process.versions.node}; ICU ${process.versions.icu ?? 'unknown'}`;
}

function canonicalDateTime(
  kind: DateTimeKind,
  value: DateTime,
  components: FormatComponents
): string {
  if (kind === 'date') return value.toFormat('yyyy-MM-dd');
  const fraction = components.millisecond ? '.SSS' : '';
  if (kind === 'time') {
    const offset = components.offset ? 'ZZ' : '';
    const zone = components.zone ? ' zzz' : '';
    return value.toFormat(`HH:mm:ss${fraction}${offset}${zone}`).trim();
  }
  if (components.offset || components.zone) return value.toUTC().toISO() ?? '';
  return value.toFormat(`yyyy-MM-dd'T'HH:mm:ss${fraction}`);
}

const dateTimeBase = descriptorBase({
  operation: 'date_time_format',
  methodId: 'openparser.transform.date-time-format.v1',
  version: 1,
  label: 'Date/time formatting',
  summary: 'Exact reformatting of one civil date/time value or instant',
  docsAnchor: 'date-time-format',
  acceptedSourceTypes: ['string'],
  acceptedOutputTypes: ['string'],
  proofClass: 'safe_equivalence',
  parameterSchema: DateTimeParametersSchema,
  library: { name: 'luxon', version: LUXON_VERSION },
  limitations:
    'Only explicit Luxon formats with four-digit years; source and target must preserve the same required components. Two-digit years, defaulted fields, and silent millisecond/offset/zone changes are not proven. Format-only JSON Schema date intent uses the versioned built-in source catalog; a claim source_format cannot add or narrow that catalog.',
});
function resolveTrustedDateTimeParameters(
  parameters: z.infer<typeof DateTimeParametersSchema>
): z.infer<typeof DateTimeParametersSchema> {
  if (parameters.sourceFormats.length === 0 || parameters.sourceCatalog) {
    return {
      ...parameters,
      sourceFormats: trustedDateSourceFormats(parameters.kind, parameters.targetFormat),
      sourceCatalog: {
        id: DATE_SOURCE_CATALOG_ID,
        version: DATE_SOURCE_CATALOG_VERSION,
      },
    };
  }
  return parameters;
}

function prioritizeSourceFormats(formats: string[], preferred?: string): string[] {
  if (!preferred || !formats.includes(preferred)) return formats;
  return [preferred, ...formats.filter((format) => format !== preferred)];
}

const dateTimeValidator: TransformValidatorDescriptor = {
  ...dateTimeBase,
  verify({ quote, output, parameters, preferredSourceFormat }) {
    const parsed = DateTimeParametersSchema.safeParse(parameters);
    if (!parsed.success || typeof output !== 'string') {
      return proof(dateTimeBase, 'not_applicable', {}, { checks: { parametersValid: false } });
    }
    const p = resolveTrustedDateTimeParameters(parsed.data);
    if (p.sourceFormats.length === 0) {
      return proof(dateTimeBase, 'not_applicable', p, {
        checks: {
          sourceTokensValid: false,
          targetTokensValid: formatHasRequiredKindTokens(p.kind, inspectFormat(p.targetFormat)),
          fullSourceConsumed: false,
          sourceRoundTrip: false,
        },
        locale: p.locale,
      });
    }
    const zone = p.zonePolicy === 'utc' ? 'UTC' : p.zonePolicy === 'named' ? p.zone : undefined;
    const targetComponents = inspectFormat(p.targetFormat);
    const preferred =
      preferredSourceFormat && p.sourceFormats.includes(preferredSourceFormat)
        ? preferredSourceFormat
        : undefined;
    const candidates = prioritizeSourceFormats(p.sourceFormats, preferred).flatMap((format) => {
      const sourceComponents = inspectFormat(format);
      if (
        !formatHasRequiredKindTokens(p.kind, sourceComponents) ||
        !formatHasRequiredKindTokens(p.kind, targetComponents) ||
        !optionalTimeComponentsAlign(sourceComponents, targetComponents)
      ) {
        return [];
      }
      const value = DateTime.fromFormat(quote, format, {
        locale: p.locale,
        zone,
        setZone: p.zonePolicy !== 'civil',
      });
      if (!value.isValid || value.toFormat(format) !== quote) return [];
      if (p.zonePolicy === 'named' && value.getPossibleOffsets().length !== 1) return [];
      return [{ value, format, components: sourceComponents }];
    });
    if (!candidates.length) {
      return proof(dateTimeBase, 'not_applicable', p, {
        checks: {
          sourceTokensValid: true,
          targetTokensValid: formatHasRequiredKindTokens(p.kind, targetComponents),
          fullSourceConsumed: false,
          sourceRoundTrip: false,
          unambiguous: false,
        },
        locale: p.locale,
        zone,
      });
    }
    const canonical = candidates.map(({ value, components }) =>
      canonicalDateTime(p.kind, value, components)
    );
    const converged = new Set(canonical).size === 1;
    const rendered = candidates[0]!.value.toFormat(p.targetFormat);
    const target = DateTime.fromFormat(rendered, p.targetFormat, {
      locale: p.locale,
      zone,
      setZone: p.zonePolicy !== 'civil',
    });
    const targetRoundTrip = target.isValid && target.toFormat(p.targetFormat) === rendered;
    const exactOutput = output === rendered;
    const result = converged && targetRoundTrip && exactOutput ? 'verified' : 'contradicted';
    const matchedSourceFormat =
      preferred && candidates.some((candidate) => candidate.format === preferred)
        ? preferred
        : candidates[0]!.format;
    return proof(dateTimeBase, result, p, {
      operands: {
        sourceHash: sha256Operand(quote),
        matchedSourceFormat: boundedOperand(matchedSourceFormat),
        canonical: boundedOperand(canonical[0]!),
        output: boundedOperand(output),
      },
      checks: {
        sourceTokensValid: true,
        targetTokensValid: true,
        componentsPreserved: true,
        fullSourceConsumed: true,
        sourceRoundTrip: true,
        formatsConverged: converged,
        targetRoundTrip,
        exactOutput,
      },
      runtime: dateTimeRuntime(),
      locale: p.locale,
      zone: zone ?? p.zonePolicy,
    });
  },
};

const numericBase = descriptorBase({
  operation: 'numeric_format',
  methodId: 'openparser.transform.numeric-format.v1',
  version: 1,
  label: 'Numeric formatting',
  summary: 'Exact decimal equivalence after a declared representation change',
  docsAnchor: 'numeric-format',
  acceptedSourceTypes: ['string'],
  acceptedOutputTypes: ['number', 'integer', 'string'],
  proofClass: 'safe_equivalence',
  parameterSchema: NumericParametersSchema,
  library: { name: 'decimal.js', version: DECIMAL_VERSION },
  limitations: 'Only declared separators and edge affixes are accepted.',
});
const numericValidator: TransformValidatorDescriptor = {
  ...numericBase,
  verify({ quote, output, parameters }) {
    const parsed = NumericParametersSchema.safeParse(parameters);
    const right = outputDecimal(output);
    if (!parsed.success || !right) {
      return proof(numericBase, 'not_applicable', {}, { checks: { parametersValid: false } });
    }
    const left = parseTrustedDecimal(quote, parsed.data);
    if (!left) {
      return proof(numericBase, 'not_applicable', parsed.data, {
        checks: { wholeQuoteMatched: false },
      });
    }
    const exact = left.eq(right);
    return proof(numericBase, exact ? 'verified' : 'contradicted', parsed.data, {
      operands: { sourceDecimal: left.toString(), outputDecimal: right.toString() },
      checks: { wholeQuoteMatched: true, exactDecimalEquality: exact },
    });
  },
};

const quantityBase = descriptorBase({
  operation: 'quantity_magnitude',
  methodId: 'openparser.transform.quantity-magnitude.v1',
  version: 1,
  label: 'Quantity magnitude',
  summary: 'Removal of an explicitly accepted unit while preserving magnitude',
  docsAnchor: 'quantity-magnitude',
  acceptedSourceTypes: ['string'],
  acceptedOutputTypes: ['number', 'integer', 'string'],
  proofClass: 'safe_equivalence',
  parameterSchema: QuantityParametersSchema,
  library: { name: 'decimal.js', version: DECIMAL_VERSION },
  limitations: 'The complete quote must be one quantity and the unit must be allowlisted.',
});
const quantityValidator: TransformValidatorDescriptor = {
  ...quantityBase,
  verify({ quote, output, parameters }) {
    const parsed = QuantityParametersSchema.safeParse(parameters);
    const right = outputDecimal(output);
    if (!parsed.success || !right) {
      return proof(quantityBase, 'not_applicable', {}, { checks: { parametersValid: false } });
    }
    const aliases = Object.keys(parsed.data.allowedUnits).sort((a, b) => b.length - a.length);
    const match = quote
      .normalize('NFKC')
      .trim()
      .match(new RegExp(`^([+-]?\\d+(?:\\.\\d+)?)\\s*(${aliases.map(escaped).join('|')})$`, 'i'));
    if (!match) {
      return proof(quantityBase, 'not_applicable', parsed.data, {
        checks: { wholeQuoteMatched: false },
      });
    }
    const canonicalUnit = Object.entries(parsed.data.allowedUnits).find(
      ([alias]) => alias.toLocaleLowerCase('en-US') === match[2]!.toLocaleLowerCase('en-US')
    )?.[1];
    const exact = canonicalUnit === parsed.data.targetUnit && new Decimal(match[1]!).eq(right);
    return proof(quantityBase, exact ? 'verified' : 'contradicted', parsed.data, {
      operands: {
        magnitude: match[1]!,
        sourceUnit: canonicalUnit!,
        targetUnit: parsed.data.targetUnit,
      },
      checks: {
        wholeQuoteMatched: true,
        acceptedUnit: Boolean(canonicalUnit),
        exactMagnitude: exact,
      },
    });
  },
};

const UNIT_RATIOS: Record<string, { dimension: string; baseRatio: string }> = {
  mm: { dimension: 'length', baseRatio: '0.001' },
  cm: { dimension: 'length', baseRatio: '0.01' },
  m: { dimension: 'length', baseRatio: '1' },
  km: { dimension: 'length', baseRatio: '1000' },
  in: { dimension: 'length', baseRatio: '0.0254' },
  ft: { dimension: 'length', baseRatio: '0.3048' },
  s: { dimension: 'duration', baseRatio: '1' },
  min: { dimension: 'duration', baseRatio: '60' },
  h: { dimension: 'duration', baseRatio: '3600' },
  day: { dimension: 'duration', baseRatio: '86400' },
  month: { dimension: 'calendar_duration', baseRatio: '1' },
  year: { dimension: 'calendar_duration', baseRatio: '12' },
  g: { dimension: 'mass', baseRatio: '1' },
  kg: { dimension: 'mass', baseRatio: '1000' },
  lb: { dimension: 'mass', baseRatio: '453.59237' },
};

const unitBase = descriptorBase({
  operation: 'unit_conversion',
  methodId: 'openparser.transform.unit-conversion.v1',
  version: 1,
  label: 'Unit conversion',
  summary: 'Exact conversion between allowlisted units in one dimension',
  docsAnchor: 'unit-conversion',
  acceptedSourceTypes: ['string'],
  acceptedOutputTypes: ['number', 'integer', 'string'],
  proofClass: 'exact_conversion',
  parameterSchema: UnitConversionParametersSchema,
  library: { name: 'decimal.js + OpenParser unit table', version: `${DECIMAL_VERSION}/1` },
  limitations: 'Only the versioned unit table is supported; no contextual or ambiguous units.',
});
const unitValidator: TransformValidatorDescriptor = {
  ...unitBase,
  verify({ quote, output, parameters }) {
    const parsed = UnitConversionParametersSchema.safeParse(parameters);
    const right = outputDecimal(output);
    if (!parsed.success || !right) {
      return proof(unitBase, 'not_applicable', {}, { checks: { parametersValid: false } });
    }
    const match = quote
      .normalize('NFKC')
      .trim()
      .match(/^([+-]?\d+(?:\.\d+)?)\s*([A-Za-z]+)$/);
    const sourceUnit = match?.[2];
    const source = sourceUnit ? UNIT_RATIOS[sourceUnit] : undefined;
    const target = UNIT_RATIOS[parsed.data.targetUnit];
    if (
      !match ||
      !sourceUnit ||
      !parsed.data.sourceUnits.includes(sourceUnit) ||
      !source ||
      !target
    ) {
      return proof(unitBase, 'not_applicable', parsed.data, {
        checks: { wholeQuoteMatched: Boolean(match), supportedUnits: false },
      });
    }
    if (source.dimension !== target.dimension) {
      return proof(unitBase, 'contradicted', parsed.data, {
        operands: { sourceUnit, targetUnit: parsed.data.targetUnit },
        checks: { sameDimension: false },
      });
    }
    const converted = new Decimal(match[1]!).mul(source.baseRatio).div(target.baseRatio);
    const exact = converted.eq(right);
    return proof(unitBase, exact ? 'verified' : 'contradicted', parsed.data, {
      operands: {
        sourceMagnitude: match[1]!,
        sourceUnit,
        targetMagnitude: converted.toString(),
        targetUnit: parsed.data.targetUnit,
      },
      checks: { wholeQuoteMatched: true, sameDimension: true, exactDecimalEquality: exact },
    });
  },
};

type CurrencySignal = { code: string; index: number; kind: 'iso' | 'alias' | 'symbol' };

function findBoundedTokens(text: string, token: string): number[] {
  const indices: number[] = [];
  const pattern = new RegExp(`(?<![A-Za-z0-9])${escaped(token)}(?![A-Za-z0-9])`, 'gi');
  for (const match of text.matchAll(pattern)) {
    if (match.index !== undefined) indices.push(match.index);
  }
  return indices;
}

function collectCurrencySignals(
  text: string,
  parameters: z.infer<typeof CurrencyParametersSchema>
): CurrencySignal[] {
  const signals: CurrencySignal[] = [];
  const isoCodes = new Set([...ISO_4217_CODES, ...parameters.acceptedCodes]);
  for (const code of isoCodes) {
    for (const index of findBoundedTokens(text, code)) {
      signals.push({ code: code.toUpperCase(), index, kind: 'iso' });
    }
  }
  for (const [alias, code] of Object.entries(parameters.aliases)) {
    for (const index of findBoundedTokens(text, alias)) {
      signals.push({ code, index, kind: 'alias' });
    }
  }
  const covered = new Array<boolean>(text.length).fill(false);
  const symbols = Object.entries(parameters.symbolMap).toSorted(
    (left, right) => right[0].length - left[0].length
  );
  for (const [symbol, code] of symbols) {
    let from = 0;
    while (from <= text.length - symbol.length) {
      const index = text.indexOf(symbol, from);
      if (index < 0) break;
      from = index + 1;
      const before = index === 0 ? '' : text[index - 1]!;
      if (/\p{L}/u.test(before)) continue;
      if (covered.slice(index, index + symbol.length).some(Boolean)) continue;
      for (let i = index; i < index + symbol.length; i += 1) covered[i] = true;
      signals.push({ code, index, kind: 'symbol' });
    }
  }
  return signals;
}

const currencyBase = descriptorBase({
  operation: 'currency_code',
  methodId: 'openparser.transform.currency-code.v1',
  version: 1,
  label: 'Currency code derivation',
  summary: 'Derivation of an ISO code from an explicit token or declared symbol policy',
  docsAnchor: 'currency-code',
  acceptedSourceTypes: ['string'],
  acceptedOutputTypes: ['string'],
  proofClass: 'safe_equivalence',
  parameterSchema: CurrencyParametersSchema,
  library: { name: 'OpenParser ISO currency token table', version: '1' },
  limitations:
    'A bare $ proves nothing unless trusted intent maps that standalone token. $ inside C$, A$, NZ$, HK$, or S$ is not a USD signal. Conflicting ISO codes or currency signals are not applied.',
});
const currencyValidator: TransformValidatorDescriptor = {
  ...currencyBase,
  verify({ quote, output, parameters }) {
    const parsed = CurrencyParametersSchema.safeParse(parameters);
    if (!parsed.success || typeof output !== 'string') {
      return proof(currencyBase, 'not_applicable', {}, { checks: { parametersValid: false } });
    }
    const text = quote.normalize('NFKC').trim();
    const accepted = new Set(parsed.data.acceptedCodes);
    const signals = collectCurrencySignals(text, parsed.data);
    const codes = [...new Set(signals.map((signal) => signal.code))];
    if (codes.length > 1) {
      return proof(currencyBase, 'not_applicable', parsed.data, {
        checks: { trustedTokenFound: true, unambiguous: false },
      });
    }
    const code = codes[0];
    if (!code || !accepted.has(code)) {
      return proof(currencyBase, 'not_applicable', parsed.data, {
        checks: { trustedTokenFound: false, unambiguous: true },
      });
    }
    const policy = signals.every((signal) => signal.kind === 'symbol');
    const exact = output === code;
    return proof(currencyBase, exact ? 'verified' : 'contradicted', parsed.data, {
      proofClass: policy ? 'policy_application' : 'safe_equivalence',
      operands: { resolvedCode: code, outputCode: output },
      checks: { trustedTokenFound: true, unambiguous: true, exactOutput: exact },
    });
  },
};

const booleanBase = descriptorBase({
  operation: 'boolean_alias',
  methodId: 'openparser.transform.boolean-alias.v1',
  version: 1,
  label: 'Boolean alias',
  summary: 'Application of a trusted exact alias map to a whole quote',
  docsAnchor: 'boolean-alias',
  acceptedSourceTypes: ['string'],
  acceptedOutputTypes: ['boolean'],
  proofClass: 'policy_application',
  parameterSchema: BooleanParametersSchema,
  library: { name: 'OpenParser alias matcher', version: '1' },
  limitations: 'No sentiment, negation, or natural-language interpretation.',
});
const booleanValidator: TransformValidatorDescriptor = {
  ...booleanBase,
  verify({ quote, output, parameters }) {
    const parsed = BooleanParametersSchema.safeParse(parameters);
    if (!parsed.success || typeof output !== 'boolean') {
      return proof(booleanBase, 'not_applicable', {}, { checks: { parametersValid: false } });
    }
    const normalize = (value: string) =>
      parsed.data.caseSensitive ? value : value.toLocaleLowerCase('en-US');
    const match = Object.entries(parsed.data.aliases).find(
      ([alias]) => normalize(alias) === normalize(quote.normalize('NFKC').trim())
    );
    if (!match) {
      return proof(booleanBase, 'not_applicable', parsed.data, {
        checks: { wholeQuoteMatched: false },
      });
    }
    const exact = match[1] === output;
    return proof(booleanBase, exact ? 'verified' : 'contradicted', parsed.data, {
      operands: { mappedValue: match[1], output },
      checks: { wholeQuoteMatched: true, exactOutput: exact },
    });
  },
};

function applyTextOperations(
  value: string,
  parameters: z.infer<typeof TextNormalizationParametersSchema>
): string {
  return parameters.operations.reduce((text, operation) => {
    switch (operation) {
      case 'trim':
        return text.trim();
      case 'collapse_whitespace':
        return text.replace(/\s+/g, ' ');
      case 'lowercase':
        return text.toLocaleLowerCase(parameters.locale);
      case 'uppercase':
        return text.toLocaleUpperCase(parameters.locale);
      case 'nfkc':
        return text.normalize('NFKC');
    }
  }, value);
}

const textBase = descriptorBase({
  operation: 'text_normalization',
  methodId: 'openparser.transform.text-normalization.v1',
  version: 1,
  label: 'Controlled text normalization',
  summary: 'Application of an ordered, enumerated text normalization plan',
  docsAnchor: 'text-normalization',
  acceptedSourceTypes: ['string'],
  acceptedOutputTypes: ['string'],
  proofClass: 'policy_application',
  parameterSchema: TextNormalizationParametersSchema,
  library: { name: 'ECMAScript String', version: 'ES2024' },
  limitations: 'Only the recorded operations run; semantic paraphrasing is never verified.',
});
const textValidator: TransformValidatorDescriptor = {
  ...textBase,
  verify({ quote, output, parameters }) {
    const parsed = TextNormalizationParametersSchema.safeParse(parameters);
    if (!parsed.success || typeof output !== 'string') {
      return proof(textBase, 'not_applicable', {}, { checks: { parametersValid: false } });
    }
    const normalized = applyTextOperations(quote, parsed.data);
    const exact = output === normalized;
    return proof(textBase, exact ? 'verified' : 'contradicted', parsed.data, {
      operands: { sourceHash: sha256Operand(quote), outputHash: sha256Operand(output) },
      checks: { operationsApplied: true, exactOutput: exact },
      locale: parsed.data.locale,
    });
  },
};

const enumBase = descriptorBase({
  operation: 'enum_alias',
  methodId: 'openparser.transform.enum-alias.v1',
  version: 1,
  label: 'Enum alias',
  summary: 'Application of a trusted exact alias table',
  docsAnchor: 'enum-alias',
  acceptedSourceTypes: ['string'],
  acceptedOutputTypes: ['string', 'number', 'integer'],
  proofClass: 'policy_application',
  parameterSchema: EnumAliasParametersSchema,
  library: { name: 'OpenParser alias matcher', version: '1' },
  limitations: 'Only exact whole-quote aliases are accepted.',
});
const enumValidator: TransformValidatorDescriptor = {
  ...enumBase,
  verify({ quote, output, parameters }) {
    const parsed = EnumAliasParametersSchema.safeParse(parameters);
    if (!parsed.success || (typeof output !== 'string' && typeof output !== 'number')) {
      return proof(enumBase, 'not_applicable', {}, { checks: { parametersValid: false } });
    }
    const normalize = (value: string) =>
      parsed.data.caseSensitive ? value : value.toLocaleLowerCase('en-US');
    const match = Object.entries(parsed.data.aliases).find(
      ([alias]) => normalize(alias) === normalize(quote.normalize('NFKC').trim())
    );
    if (!match) {
      return proof(enumBase, 'not_applicable', parsed.data, {
        checks: { wholeQuoteMatched: false },
      });
    }
    const exact = match[1] === output;
    return proof(enumBase, exact ? 'verified' : 'contradicted', parsed.data, {
      operands: {
        mappedValue: typeof match[1] === 'string' ? boundedOperand(match[1]) : match[1],
        output: typeof output === 'string' ? boundedOperand(output) : output,
      },
      checks: { wholeQuoteMatched: true, exactOutput: exact },
    });
  },
};

export const TRANSFORM_VALIDATORS = [
  dateTimeValidator,
  numericValidator,
  quantityValidator,
  unitValidator,
  currencyValidator,
  booleanValidator,
  textValidator,
  enumValidator,
] as const satisfies readonly TransformValidatorDescriptor[];

const VALIDATOR_BY_OPERATION = new Map(
  TRANSFORM_VALIDATORS.map((descriptor) => [descriptor.operation, descriptor])
);

export function transformValidatorDescriptor(
  operation: TransformOperation
): TransformValidatorDescriptor {
  return VALIDATOR_BY_OPERATION.get(operation)!;
}

function claimedDateSourceFormat(claim: TransformClaim | undefined): string | undefined {
  if (!claim || claim.operation !== 'date_time_format') return undefined;
  const value = claim.parameters.source_format;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Verify only the validator selected by trusted request intent. Model claims never authorize it. */
export function verifyTransform(input: {
  quote: string;
  output: unknown;
  intent: TransformIntent;
  claim?: TransformClaim;
}): TransformVerificationResult {
  const intent = TransformIntentSchema.parse(input.intent);
  const descriptor = transformValidatorDescriptor(intent.operation);
  const hinted = claimedDateSourceFormat(input.claim);
  return descriptor.verify({
    quote: input.quote,
    output: input.output,
    parameters: intent.parameters,
    ...(intent.operation === 'date_time_format' && hinted ? { preferredSourceFormat: hinted } : {}),
  });
}
