import { describe, expect, test } from 'bun:test';
import {
  DATE_SOURCE_CATALOG_ID,
  DATE_SOURCE_CATALOG_VERSION,
  MAX_TRANSFORM_INTENT_PARAMETER_BYTES,
  MAX_TRANSFORM_PROOF_BYTES,
  TRANSFORM_VALIDATORS,
  TransformIntentSchema,
  isTrustedTransformDocsHref,
  parseTransformProof,
  transformValidatorDescriptor,
  trustedDateSourceFormats,
  trustedIntentParametersFitProof,
  trustedTransformDocsHref,
  verifyTransform,
} from './transform-validation';

const verify = (
  quote: string,
  output: unknown,
  intent: Parameters<typeof verifyTransform>[0]['intent'],
  claimOperation = intent.operation
) =>
  verifyTransform({
    quote,
    output,
    intent,
    claim: {
      operation: claimOperation,
      parameters: {},
      reason: 'untrusted model report',
      confidence: 'high',
    },
  });

describe('transform validator registry', () => {
  test('publishes stable versioned descriptors and JSON parameter schemas', () => {
    expect(TRANSFORM_VALIDATORS.map((entry) => entry.methodId)).toEqual([
      'openparser.transform.date-time-format.v1',
      'openparser.transform.numeric-format.v1',
      'openparser.transform.quantity-magnitude.v1',
      'openparser.transform.unit-conversion.v1',
      'openparser.transform.currency-code.v1',
      'openparser.transform.boolean-alias.v1',
      'openparser.transform.text-normalization.v1',
      'openparser.transform.enum-alias.v1',
    ]);
    for (const descriptor of TRANSFORM_VALIDATORS) {
      expect(descriptor.parameterJsonSchema).toBeTruthy();
      expect(descriptor.docsAnchor).toBeTruthy();
      expect(descriptor.version).toBe(1);
    }
  });

  test('strictly validates bounded trusted intent', () => {
    expect(
      TransformIntentSchema.safeParse({
        operation: 'text_normalization',
        parameters: { operations: ['trim'], invented: true },
      }).success
    ).toBe(false);
  });

  test('strict date formatting consumes and round-trips the full quote', () => {
    const intent = {
      operation: 'date_time_format',
      parameters: {
        kind: 'date',
        sourceFormats: ['d MMMM yyyy', 'dd MMMM yyyy'],
        targetFormat: 'yyyy-MM-dd',
        locale: 'en-US',
        zonePolicy: 'civil',
      },
    } as const;
    expect(verify('20 May 2025', '2025-05-20', intent).result).toBe('verified');
    expect(verify('20 May 2025 trailing', '2025-05-20', intent).result).toBe('not_applicable');
    expect(verify('20 May 2025', '2025-05-21', intent).result).toBe('contradicted');
  });

  test('rejects defaulted date components, ambiguous source formats, and DST ambiguity', () => {
    expect(
      verify('May 2025', '2025-05-01', {
        operation: 'date_time_format',
        parameters: {
          kind: 'date',
          sourceFormats: ['MMMM yyyy'],
          targetFormat: 'yyyy-MM-dd',
          locale: 'en-US',
          zonePolicy: 'civil',
        },
      }).result
    ).toBe('not_applicable');
    expect(
      verify('05/06/2025', '2025-05-06', {
        operation: 'date_time_format',
        parameters: {
          kind: 'date',
          sourceFormats: ['dd/MM/yyyy', 'MM/dd/yyyy'],
          targetFormat: 'yyyy-MM-dd',
          locale: 'en-US',
          zonePolicy: 'civil',
        },
      }).result
    ).toBe('contradicted');
    expect(
      verify('2025-11-02 01:30:00', '2025-11-02T01:30:00-04:00', {
        operation: 'date_time_format',
        parameters: {
          kind: 'date-time',
          sourceFormats: ['yyyy-MM-dd HH:mm:ss'],
          targetFormat: "yyyy-MM-dd'T'HH:mm:ssZZ",
          locale: 'en-US',
          zonePolicy: 'named',
          zone: 'America/New_York',
        },
      }).result
    ).toBe('not_applicable');
    expect(
      verify('10:15:30+02:00', '10:15:30+02:00', {
        operation: 'date_time_format',
        parameters: {
          kind: 'time',
          sourceFormats: ['HH:mm:ssZZ'],
          targetFormat: 'HH:mm:ssZZ',
          locale: 'en-US',
          zonePolicy: 'preserve',
        },
      }).result
    ).toBe('verified');
  });

  test('rejects two-digit years, lossy targets, and silently added milliseconds', () => {
    expect(
      verify('20 May 25', '2025-05-20', {
        operation: 'date_time_format',
        parameters: {
          kind: 'date',
          sourceFormats: ['d MMMM yy'],
          targetFormat: 'yyyy-MM-dd',
          locale: 'en-US',
          zonePolicy: 'civil',
        },
      }).result
    ).toBe('not_applicable');
    expect(
      verify('20 May 2025', '2025', {
        operation: 'date_time_format',
        parameters: {
          kind: 'date',
          sourceFormats: ['d MMMM yyyy'],
          targetFormat: 'yyyy',
          locale: 'en-US',
          zonePolicy: 'civil',
        },
      }).result
    ).toBe('not_applicable');
    expect(
      verify('10:15:30+02:00', '10:15:30.000+02:00', {
        operation: 'date_time_format',
        parameters: {
          kind: 'time',
          sourceFormats: ['HH:mm:ssZZ'],
          targetFormat: 'HH:mm:ss.SSSZZ',
          locale: 'en-US',
          zonePolicy: 'preserve',
        },
      }).result
    ).toBe('not_applicable');
    expect(
      verify('20 May 2025', '2025-05-20', {
        operation: 'date_time_format',
        parameters: {
          kind: 'date',
          sourceFormats: ['d MMMM yyyy'],
          targetFormat: 'yyyy-MM-dd',
          locale: 'en-US',
          zonePolicy: 'civil',
        },
      }).result
    ).toBe('verified');
    expect(
      verify('2025-05-20T10:15:30.123+02:00', '2025-05-20T10:15:30.123+02:00', {
        operation: 'date_time_format',
        parameters: {
          kind: 'date-time',
          sourceFormats: ["yyyy-MM-dd'T'HH:mm:ss.SSSZZ"],
          targetFormat: "yyyy-MM-dd'T'HH:mm:ss.SSSZZ",
          locale: 'en-US',
          zonePolicy: 'preserve',
        },
      }).result
    ).toBe('verified');
  });

  test('uses exact decimals for numeric formatting', () => {
    const intent = {
      operation: 'numeric_format',
      parameters: {
        decimalSeparator: '.',
        groupingSeparator: ',',
        prefixes: ['$'],
        suffixes: [],
        accountingParentheses: true,
      },
    } as const;
    expect(verify('$8,646.00', 8646, intent).result).toBe('verified');
    expect(verify('$0.1000000000000000001', '0.1000000000000000001', intent).result).toBe(
      'verified'
    );
    expect(verify('Rent is $8,646', 8646, intent).result).toBe('not_applicable');
  });

  test('distinguishes magnitude stripping from exact unit conversion', () => {
    expect(
      verify('5 month(s)', 5, {
        operation: 'quantity_magnitude',
        parameters: { allowedUnits: { 'month(s)': 'month' }, targetUnit: 'month' },
      }).result
    ).toBe('verified');
    expect(
      verify('5 years', 5, {
        operation: 'quantity_magnitude',
        parameters: { allowedUnits: { years: 'year' }, targetUnit: 'month' },
      }).result
    ).toBe('contradicted');
    expect(
      verify('5 year', 60, {
        operation: 'unit_conversion',
        parameters: { sourceUnits: ['year'], targetUnit: 'month' },
      }).result
    ).toBe('verified');
    expect(
      verify('5 year', 5, {
        operation: 'unit_conversion',
        parameters: { sourceUnits: ['year'], targetUnit: 'month' },
      }).result
    ).toBe('contradicted');
  });

  test('does not derive a currency from bare dollar without trusted policy', () => {
    const noPolicy = {
      operation: 'currency_code',
      parameters: { acceptedCodes: ['USD'], aliases: { 'US dollars': 'USD' }, symbolMap: {} },
    } as const;
    expect(verify('USD 8,646', 'USD', noPolicy).result).toBe('verified');
    expect(verify('US dollars 8,646', 'USD', noPolicy).result).toBe('verified');
    expect(verify('$8,646', 'USD', noPolicy).result).toBe('not_applicable');
    const policy = verify('$8,646', 'USD', {
      ...noPolicy,
      parameters: { ...noPolicy.parameters, symbolMap: { $: 'USD' } },
    });
    expect(policy.result).toBe('verified');
    expect(policy.proof.proofClass).toBe('policy_application');
  });

  test('does not treat compound dollar symbols or conflicting ISO codes as USD', () => {
    const policy = {
      operation: 'currency_code',
      parameters: {
        acceptedCodes: ['USD', 'CAD', 'AUD', 'NZD', 'HKD', 'SGD'],
        aliases: {},
        symbolMap: { $: 'USD' },
      },
    } as const;
    for (const quote of ['C$5', 'A$5', 'NZ$5', 'HK$5', 'S$5']) {
      expect(verify(quote, 'USD', policy).result).toBe('not_applicable');
    }
    expect(verify('Cost is $5 (CAD)', 'USD', policy).result).toBe('not_applicable');
    expect(verify('Cost is $5 (CAD)', 'CAD', policy).result).toBe('not_applicable');
    expect(verify('(CAD) 5', 'CAD', policy).result).toBe('verified');
    expect(verify('Paid in CAD, not USD', 'CAD', policy).result).toBe('not_applicable');
  });

  test('resolves explicit ISO codes by textual occurrence rather than acceptedCodes order', () => {
    const intent = {
      operation: 'currency_code',
      parameters: { acceptedCodes: ['USD', 'EUR'], aliases: {}, symbolMap: {} },
    } as const;
    expect(verify('Invoice total EUR 12', 'EUR', intent).result).toBe('verified');
    expect(verify('Invoice total EUR 12', 'USD', intent).result).toBe('contradicted');
  });

  test('applies only trusted aliases and enumerated normalization operations', () => {
    expect(
      verify('YES', true, {
        operation: 'boolean_alias',
        parameters: { aliases: { yes: true, no: false }, caseSensitive: false },
      }).result
    ).toBe('verified');
    expect(
      verify('Lessee may not renew', false, {
        operation: 'boolean_alias',
        parameters: { aliases: { yes: true, no: false }, caseSensitive: false },
      }).result
    ).toBe('not_applicable');
    expect(
      verify('  Industrial   Space ', 'Industrial Space', {
        operation: 'text_normalization',
        parameters: { operations: ['trim', 'collapse_whitespace'], locale: 'en-US' },
      }).result
    ).toBe('verified');
    expect(
      verify('Conditions precedent', '901', {
        operation: 'enum_alias',
        parameters: { aliases: { 'Conditions precedent': '901' }, caseSensitive: true },
      }).result
    ).toBe('verified');
  });

  test('an adversarial model claim cannot authorize another validator', () => {
    const result = verify(
      '$8,646',
      'USD',
      {
        operation: 'enum_alias',
        parameters: { aliases: {}, caseSensitive: true },
      },
      'currency_code'
    );
    expect(result.result).toBe('not_applicable');
    expect(result.proof.methodId).toBe('openparser.transform.enum-alias.v1');
  });

  test('an untrusted claim cannot change target format, locale, or zone policy', () => {
    const result = verifyTransform({
      quote: '20 May 2025',
      output: '2025',
      intent: {
        operation: 'date_time_format',
        parameters: {
          kind: 'date',
          sourceFormats: ['d MMMM yyyy'],
          targetFormat: 'yyyy-MM-dd',
          locale: 'en-US',
          zonePolicy: 'civil',
        },
      },
      claim: {
        operation: 'date_time_format',
        parameters: { source_format: 'd MMMM yyyy', target_format: 'yyyy', locale: 'fr-FR' },
        reason: 'rewrite to year only',
        confidence: 'high',
      },
    });
    expect(result.result).toBe('contradicted');
    expect(result.proof.trustedParameters.targetFormat).toBe('yyyy-MM-dd');
    expect(result.proof.trustedParameters.locale).toBe('en-US');
  });

  test('format-only dates use the built-in catalog and ignore adversarial claim formats', () => {
    const formatOnly = {
      operation: 'date_time_format' as const,
      parameters: {
        kind: 'date' as const,
        sourceFormats: [] as string[],
        targetFormat: 'yyyy-MM-dd',
        locale: 'en-US',
        zonePolicy: 'civil' as const,
      },
    };
    const catalog = trustedDateSourceFormats('date');
    const written = verifyTransform({
      quote: '20 May 2025',
      output: '2025-05-20',
      intent: formatOnly,
      claim: {
        operation: 'date_time_format',
        parameters: { source_format: 'd MMMM yyyy' },
        reason: 'reformatted',
        confidence: 'high',
      },
    });
    expect(written.result).toBe('verified');
    expect(written.proof.trustedParameters.sourceCatalog).toEqual({
      id: DATE_SOURCE_CATALOG_ID,
      version: DATE_SOURCE_CATALOG_VERSION,
    });
    expect(written.proof.trustedParameters.sourceFormats).toEqual(catalog);
    expect(written.proof.trustedParameters.sourceFormats).not.toEqual(['d MMMM yyyy']);
    expect(catalog).toContain(written.proof.operands?.matchedSourceFormat);
    expect(JSON.stringify(written.proof.trustedParameters)).not.toContain('claimed');

    const dayOf = verifyTransform({
      quote: '20 day of May 2025',
      output: '2025-05-20',
      intent: formatOnly,
    });
    expect(dayOf.result).toBe('verified');
    expect(dayOf.proof.operands?.matchedSourceFormat).toBe("d 'day of' MMMM yyyy");

    for (const hint of ['MM/dd/yyyy', 'dd/MM/yyyy'] as const) {
      const ambiguous = verifyTransform({
        quote: '05/06/2025',
        output: hint === 'MM/dd/yyyy' ? '2025-05-06' : '2025-06-05',
        intent: formatOnly,
        claim: {
          operation: 'date_time_format',
          parameters: { source_format: hint },
          reason: 'locale guess',
          confidence: 'high',
        },
      });
      expect(ambiguous.result).not.toBe('verified');
      expect(ambiguous.proof.trustedParameters.sourceFormats).toEqual(catalog);
      expect(ambiguous.proof.trustedParameters.sourceFormats).not.toContain(hint);
      expect(JSON.stringify(ambiguous.proof.trustedParameters)).not.toContain(hint);
    }

    const invented = 'EEEE, MMMM d, yyyy';
    const broadened = verifyTransform({
      quote: 'Tuesday, May 20, 2025',
      output: '2025-05-20',
      intent: formatOnly,
      claim: {
        operation: 'date_time_format',
        parameters: { source_format: invented },
        reason: 'add weekday form',
        confidence: 'high',
      },
    });
    expect(broadened.result).not.toBe('verified');
    expect(broadened.proof.trustedParameters.sourceFormats).toEqual(catalog);
    expect(broadened.proof.trustedParameters.sourceFormats).not.toContain(invented);

    expect(
      verifyTransform({
        quote: '20 May 2025',
        output: '2025-05-20',
        intent: formatOnly,
        claim: {
          operation: 'currency_code',
          parameters: { source_format: 'd MMMM yyyy', token: 'USD' },
          reason: 'this is currency',
          confidence: 'high',
        },
      }).result
    ).toBe('verified');
    expect(
      verifyTransform({
        quote: '20 May 2025',
        output: 'USD',
        intent: formatOnly,
        claim: {
          operation: 'currency_code',
          parameters: { token: 'USD' },
          reason: 'broaden to currency',
          confidence: 'high',
        },
      }).proof.methodId
    ).toBe('openparser.transform.date-time-format.v1');
  });

  test('bounds privacy-safe proof metadata and never verifies without replayable policy', () => {
    const hundred = Object.fromEntries(
      Array.from({ length: 100 }, (_, index) => [`alias-${index}-${'x'.repeat(40)}`, index])
    );
    expect(
      TransformIntentSchema.safeParse({
        operation: 'enum_alias',
        parameters: { aliases: hundred, caseSensitive: true },
      }).success
    ).toBe(false);
    const rejected = transformValidatorDescriptor('enum_alias').verify({
      quote: 'alias-1-' + 'x'.repeat(40),
      output: 1,
      parameters: { aliases: hundred, caseSensitive: true },
    });
    expect(rejected.result).toBe('not_applicable');
    expect(rejected.proof.result).not.toBe('verified');
    expect(rejected.proof.trustedParameters).not.toEqual({ bounded: true });

    const oversized = Object.fromEntries(
      Array.from({ length: 16 }, (_, index) => [`alias-${index}-${'x'.repeat(200)}`, index])
    );
    expect(trustedIntentParametersFitProof({ aliases: oversized, caseSensitive: true })).toBe(
      false
    );
    expect(
      new TextEncoder().encode(JSON.stringify({ aliases: oversized, caseSensitive: true }))
        .byteLength
    ).toBeGreaterThan(MAX_TRANSFORM_INTENT_PARAMETER_BYTES);
    const overflow = transformValidatorDescriptor('enum_alias').verify({
      quote: 'alias-0-' + 'x'.repeat(200),
      output: 0,
      parameters: { aliases: oversized, caseSensitive: true },
    });
    expect(overflow.result).toBe('not_applicable');
    expect(overflow.proof.result).toBe('not_applicable');
    expect(overflow.proof.trustedParameters).toMatchObject({ reason: 'proof_too_large' });
    expect(overflow.proof.trustedParameters).not.toEqual({ bounded: true });
    expect(
      overflow.proof.trustedParameters.sourceFormats ?? overflow.proof.trustedParameters.aliases
    ).toBeUndefined();
    expect(overflow.proof.operands).toMatchObject({
      policyHash: { algorithm: 'sha256' },
    });
    expect(new TextEncoder().encode(JSON.stringify(overflow.proof)).byteLength).toBeLessThanOrEqual(
      MAX_TRANSFORM_PROOF_BYTES
    );

    const dated = verify('20 May 2025', '2025-05-20', {
      operation: 'date_time_format',
      parameters: {
        kind: 'date',
        sourceFormats: ['d MMMM yyyy'],
        targetFormat: 'yyyy-MM-dd',
        locale: 'en-US',
        zonePolicy: 'civil',
      },
    });
    const serialized = JSON.stringify(dated.proof);
    expect(serialized).not.toContain('20 May 2025');
    expect(dated.result).toBe('verified');
    expect(dated.proof.trustedParameters).toMatchObject({
      sourceFormats: ['d MMMM yyyy'],
      targetFormat: 'yyyy-MM-dd',
    });
    expect(dated.proof.trustedParameters).not.toEqual({ bounded: true });
    expect(dated.proof.operands).toMatchObject({
      sourceHash: { algorithm: 'sha256' },
      matchedSourceFormat: 'd MMMM yyyy',
      canonical: '2025-05-20',
    });
  });

  test('parses historical proofs strictly and rejects hostile docs hrefs', () => {
    expect(
      parseTransformProof({
        methodId: 'openparser.transform.date-time-format.v1',
        methodVersion: 1,
        result: 'verified',
        scope: 'Exact reformatting',
        trustedParameters: {},
        implementation: { library: 'luxon', version: '3.7.2' },
        limitations: 'Only explicit formats.',
        docsHref: 'javascript:alert(1)',
      })
    ).toBeUndefined();
    const recovered = parseTransformProof({
      methodId: 'openparser.transform.date-time-format.v1',
      methodVersion: 1,
      result: 'verified',
      proofClass: 'safe_equivalence',
      scope: 'Exact reformatting of one civil date/time value or instant',
      trustedParameters: { kind: 'date' },
      operands: { source: '20 May 2025', canonical: '2025-05-20' },
      checks: { exactOutput: true },
      implementation: { library: 'luxon', version: '3.7.2' },
      limitations: 'Only explicit formats.',
      docsHref: 'https://evil.example/phish',
    });
    expect(recovered?.docsHref).toBe(
      'https://docs.openparser.dev/lineage/openparser/transform-verification#date-time-format'
    );
    expect(recovered?.operands).toEqual({ canonical: '2025-05-20' });
    expect(isTrustedTransformDocsHref('javascript:alert(1)')).toBe(false);
    expect(isTrustedTransformDocsHref('https://example.com')).toBe(false);
    expect(
      isTrustedTransformDocsHref(
        'https://docs.openparser.dev/lineage/openparser/transform-verification#date-time-format'
      )
    ).toBe(true);
    expect(trustedTransformDocsHref('unknown')).toBe(
      'https://docs.openparser.dev/lineage/openparser/transform-verification'
    );
  });
});
