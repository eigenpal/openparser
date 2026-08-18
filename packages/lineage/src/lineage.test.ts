import { describe, expect, it } from 'bun:test';
import {
  ConfidenceAssertionSchema,
  JsonPointerSchema,
  LINEAGE_FORMAT,
  LineageBuilder,
  LineageValidationError,
  TimestampSchema,
  entityAncestors,
  entityDescendants,
  lineageIdToProvQualifiedName,
  parseLineageDocument,
  safeParseLineageDocument,
  toProvJson,
  topologicalEntityOrder,
  validateLineageGraph,
  type LineageDocument,
} from './index';

function multiInputComputeDoc() {
  return {
    format: LINEAGE_FORMAT,
    id: 'run-1',
    entities: {
      a: { kind: 'value' as const, name: 'left', value: 2 },
      b: { kind: 'value' as const, name: 'right', value: 3 },
      sum: { kind: 'value' as const, name: 'sum', value: 5 },
    },
    activities: {
      add: {
        type: 'compute.add',
        name: 'add',
        status: 'ended' as const,
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: '2024-01-01T00:00:01.000Z',
        implementation: { type: 'function', name: 'add', version: '1' },
        parameters: { op: '+' },
      },
    },
    agents: {
      worker: { type: 'software', name: 'compute-worker' },
    },
    derivations: [
      {
        id: 'd-sum',
        output: 'sum',
        activity: 'add',
        inputs: [
          { entity: 'a', role: 'left', effect: 'direct' as const },
          { entity: 'b', role: 'right', effect: 'direct' as const },
        ],
        transformation: { type: 'arithmetic', expression: 'a + b' },
        confidence: {
          score: 1,
          scale: { min: 0, max: 1 },
          kind: 'derived' as const,
          scope: 'compute',
          calibrated: true,
        },
      },
    ],
    outputs: ['sum'],
  };
}

describe('lineage@1 multi-input compute', () => {
  it('accepts a valid multi-input derivation DAG', () => {
    const doc = parseLineageDocument(multiInputComputeDoc());
    expect(doc.format).toBe('lineage@1');
    expect(doc.derivations).toHaveLength(1);
    expect(doc.derivations[0]!.inputs).toHaveLength(2);
    expect(doc.outputs).toEqual(['sum']);
  });

  it('retains non-unit confidence scales', () => {
    const assertion = ConfidenceAssertionSchema.parse({
      score: 87,
      scale: { min: 0, max: 100 },
      kind: 'reported',
      scope: 'recognition',
      calibrated: false,
      method: 'provider-native',
      sampleCount: 12,
    });
    expect(assertion.score).toBe(87);
    expect(assertion.scale).toEqual({ min: 0, max: 100 });
  });

  it('uses typed confidence provenance references', () => {
    const assertion = ConfidenceAssertionSchema.parse({
      score: 0.8,
      scale: { min: 0, max: 1 },
      kind: 'reported',
      scope: 'recognition',
      sources: [{ type: 'activity', id: 'ocr' }],
    });
    expect(assertion.sources).toEqual([{ type: 'activity', id: 'ocr' }]);
  });

  it('uses RFC 6901 pointers for value locations', () => {
    expect(JsonPointerSchema.parse('/invoice/line_items/0/description')).toBe(
      '/invoice/line_items/0/description'
    );
    expect(JsonPointerSchema.parse('/a~1b/~0key')).toBe('/a~1b/~0key');
    expect(JsonPointerSchema.safeParse('invoice.total').success).toBe(false);
  });

  it('rejects confidence scores outside their scale', () => {
    const result = ConfidenceAssertionSchema.safeParse({
      score: 1.5,
      scale: { min: 0, max: 1 },
      kind: 'reported',
      scope: 'x',
    });
    expect(result.success).toBe(false);
  });
});

describe('lineage@1 graph validation', () => {
  it('rejects cycles in the entity dependency graph', () => {
    const result = safeParseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: {
        a: { kind: 'value', value: 1 },
        b: { kind: 'value', value: 2 },
      },
      activities: {
        t: { type: 'transform' },
      },
      agents: {},
      derivations: [
        {
          id: 'd1',
          output: 'b',
          activity: 't',
          inputs: [{ entity: 'a', effect: 'direct' }],
        },
        {
          id: 'd2',
          output: 'a',
          activity: 't',
          inputs: [{ entity: 'b', effect: 'direct' }],
        },
      ],
      outputs: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(LineageValidationError);
      expect(String(result.error.message)).toContain('cycle');
    }
  });

  it('rejects missing entity references', () => {
    const result = safeParseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: { a: { kind: 'value', value: 1 } },
      activities: { t: { type: 'transform' } },
      agents: {},
      derivations: [
        {
          id: 'd1',
          output: 'missing',
          activity: 't',
          inputs: [{ entity: 'a', effect: 'direct' }],
        },
      ],
      outputs: [],
    });
    expect(result.success).toBe(false);
  });

  it('resolves references from sign-offs and per-input confidence too', () => {
    const document = {
      format: LINEAGE_FORMAT,
      entities: {
        region: { kind: 'evidence', value: 'Acme' },
        vendor: {
          kind: 'value',
          path: '/vendor',
          value: 'Acme',
          approvals: [{ agent: 'reviewer', at: '2026-08-05T18:00:00.000Z' }],
        },
      },
      activities: { extract: { type: 'extract' } },
      agents: { reviewer: { type: 'human' } },
      derivations: [
        {
          output: 'vendor',
          activity: 'extract',
          inputs: [
            {
              entity: 'region',
              confidence: {
                score: 0.9,
                scale: { min: 0, max: 1 },
                kind: 'derived',
                scope: 'recognition',
                sources: [{ type: 'activity', id: 'extract' }],
              },
            },
          ],
        },
      ],
      outputs: ['vendor'],
    };
    expect(safeParseLineageDocument(document).success).toBe(true);

    const unknownApprover = safeParseLineageDocument({
      ...document,
      agents: {},
    });
    expect(unknownApprover.success).toBe(false);
    if (!unknownApprover.success) {
      expect(unknownApprover.error.message).toContain('approvals[0]: agent "reviewer"');
    }

    const unknownConfidenceSource = safeParseLineageDocument({
      ...document,
      derivations: [
        {
          ...document.derivations[0]!,
          inputs: [
            {
              entity: 'region',
              confidence: {
                score: 0.9,
                scale: { min: 0, max: 1 },
                kind: 'derived',
                scope: 'recognition',
                sources: [{ type: 'activity', id: 'ghost' }],
              },
            },
          ],
        },
      ],
    });
    expect(unknownConfidenceSource.success).toBe(false);
    if (!unknownConfidenceSource.success) {
      expect(unknownConfidenceSource.error.message).toContain(
        'inputs[0].confidence.sources: activity "ghost"'
      );
    }
  });

  it('rejects a second producer for the same derived output', () => {
    const result = safeParseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: {
        a: { kind: 'value', value: 1 },
        b: { kind: 'value', value: 2 },
      },
      activities: {
        t1: { type: 'transform' },
        t2: { type: 'transform' },
      },
      agents: {},
      derivations: [
        {
          id: 'd1',
          output: 'b',
          activity: 't1',
          inputs: [{ entity: 'a', effect: 'direct' }],
        },
        {
          id: 'd2',
          output: 'b',
          activity: 't2',
          inputs: [{ entity: 'a', effect: 'direct' }],
        },
      ],
      outputs: ['b'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(String(result.error.message)).toContain('one producer');
    }
  });

  it('rejects self-input derivations', () => {
    const result = safeParseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: { a: { kind: 'value', value: 1 } },
      activities: { t: { type: 'transform' } },
      agents: {},
      derivations: [
        {
          id: 'd1',
          output: 'a',
          activity: 't',
          inputs: [{ entity: 'a', effect: 'direct' }],
        },
      ],
      outputs: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(String(result.error.message)).toContain('own input');
    }
  });

  it('rejects timestamps that are not RFC 3339', () => {
    expect(TimestampSchema.safeParse('not-a-date').success).toBe(false);
    expect(TimestampSchema.safeParse('yesterday').success).toBe(false);
    expect(TimestampSchema.safeParse('2024-01-01').success).toBe(false);
    expect(TimestampSchema.safeParse('2024-01-01T00:00:00').success).toBe(false);
    expect(TimestampSchema.safeParse('2024-13-01T00:00:00.000Z').success).toBe(false);
    // Date.parse rolls this to 1 March; RFC 3339 validation must not.
    expect(TimestampSchema.safeParse('2024-02-30T00:00:00.000Z').success).toBe(false);
    expect(Number.isNaN(Date.parse('not-a-date'))).toBe(true);
    expect(Number.isNaN(Date.parse('2024-02-30T00:00:00.000Z'))).toBe(false);

    const result = safeParseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: {},
      activities: {
        t: {
          type: 'transform',
          startedAt: 'not-a-date',
          endedAt: 'also-bad',
        },
      },
      agents: {},
      derivations: [],
      outputs: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts RFC 3339 timestamps with Z or numeric offsets', () => {
    expect(TimestampSchema.parse('2024-01-01T00:00:00.000Z')).toBe('2024-01-01T00:00:00.000Z');
    expect(TimestampSchema.parse('1996-12-19T16:39:57-08:00')).toBe('1996-12-19T16:39:57-08:00');
  });

  it('rejects unparseable activity timestamps at graph validation', () => {
    expect(() =>
      validateLineageGraph({
        format: LINEAGE_FORMAT,
        entities: {},
        activities: {
          t: { type: 'transform', startedAt: 'nope', endedAt: 'nope' },
        },
        agents: {},
        derivations: [],
        relations: [],
        outputs: [],
      } as LineageDocument)
    ).toThrow(/not a valid RFC 3339 timestamp/);
  });

  it('rejects endedAt preceding startedAt', () => {
    const result = safeParseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: {},
      activities: {
        t: {
          type: 'transform',
          startedAt: '2024-01-02T00:00:00.000Z',
          endedAt: '2024-01-01T00:00:00.000Z',
        },
      },
      agents: {},
      derivations: [],
      outputs: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(String(result.error.message)).toContain('endedAt precedes');
    }
  });

  it('rejects member_of targeting a non-collection', () => {
    const result = safeParseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: {
        item: { kind: 'value', value: 1 },
        notBag: { kind: 'value', value: 2 },
      },
      activities: {},
      agents: {},
      derivations: [],
      relations: [{ type: 'member_of', source: 'item', target: 'notBag' }],
      outputs: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('LineageBuilder', () => {
  it('builds and validates a document ergonomically', () => {
    const doc = new LineageBuilder()
      .withId('builder-1')
      .agent('alice', { type: 'person', name: 'Alice' })
      .entity('src', {
        kind: 'artifact',
        name: 'input.csv',
        locator: { uri: 'file:///tmp/input.csv', mediaType: 'text/csv' },
        attributions: [{ agent: 'alice', role: 'author' }],
      })
      .entity('out', { kind: 'value', value: { rows: 10 } })
      .activity('parse', {
        type: 'parse.csv',
        status: 'ended',
        associations: [{ agent: 'alice', role: 'operator' }],
      })
      .derive({
        id: 'd1',
        output: 'out',
        activity: 'parse',
        inputs: ['src'],
      })
      .withOutputs('out')
      .build();

    expect(doc.id).toBe('builder-1');
    expect(doc.derivations[0]!.inputs[0]!.entity).toBe('src');
  });

  it('throws on invalid graphs at build time', () => {
    expect(() =>
      new LineageBuilder()
        .entity('a', { kind: 'value', value: 1 })
        .activity('t', { type: 'x' })
        .derive({ id: 'd', output: 'missing', activity: 't', inputs: ['a'] })
        .build()
    ).toThrow(LineageValidationError);
  });
});

describe('traversal helpers', () => {
  it('returns topological entity order and ancestors/descendants', () => {
    const doc = parseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: {
        a: { kind: 'value', value: 1 },
        b: { kind: 'value', value: 2 },
        c: { kind: 'value', value: 3 },
      },
      activities: {
        t1: { type: 'map' },
        t2: { type: 'map' },
      },
      agents: {},
      derivations: [
        {
          id: 'd1',
          output: 'b',
          activity: 't1',
          inputs: [{ entity: 'a', effect: 'direct' }],
        },
        {
          id: 'd2',
          output: 'c',
          activity: 't2',
          inputs: [{ entity: 'b', effect: 'direct' }],
        },
      ],
      outputs: ['c'],
    });

    const order = topologicalEntityOrder(doc);
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
    expect(entityAncestors(doc, 'c').sort()).toEqual(['a', 'b']);
    expect(entityDescendants(doc, 'a').sort()).toEqual(['b', 'c']);
  });
});

describe('toProvJson', () => {
  it('maps entities, activities, agents, and derivations to PROV-JSON', () => {
    const doc = parseLineageDocument({
      ...multiInputComputeDoc(),
      agents: {
        worker: { type: 'software', name: 'compute-worker' },
      },
      activities: {
        add: {
          type: 'compute.add',
          name: 'add',
          associations: [{ agent: 'worker', role: 'executor' }],
        },
      },
      entities: {
        a: { kind: 'value', value: 2, attributions: [{ agent: 'worker' }] },
        b: { kind: 'value', value: 3 },
        sum: { kind: 'value', value: 5 },
        bag: { kind: 'collection', name: 'results' },
      },
      relations: [{ type: 'member_of', source: 'sum', target: 'bag' }],
      derivations: [
        {
          id: 'd-sum',
          output: 'sum',
          activity: 'add',
          inputs: [
            { entity: 'a', role: 'left', effect: 'direct' },
            { entity: 'b', role: 'right', effect: 'direct' },
          ],
        },
      ],
      outputs: ['sum'],
    });

    const prov = toProvJson(doc);
    const qname = lineageIdToProvQualifiedName;
    expect(prov.entity?.[qname('sum')]).toBeDefined();
    expect(prov.activity?.[qname('add')]?.['prov:type']).toBe('compute.add');
    expect(prov.agent?.[qname('worker')]?.['prov:type']).toBe('software');
    expect(Object.keys(prov.wasDerivedFrom ?? {})).toHaveLength(2);
    expect(prov.wasGeneratedBy?.[qname('gen:d-sum')]).toEqual({
      'prov:entity': qname('sum'),
      'prov:activity': qname('add'),
    });
    expect(Object.keys(prov.used ?? {})).toHaveLength(2);
    expect(prov.wasAssociatedWith?.[qname('assoc:add:0')]?.['prov:agent']).toBe(qname('worker'));
    expect(prov.wasAttributedTo?.[qname('attr:a:0')]?.['prov:agent']).toBe(qname('worker'));
    expect(prov.hadMember?.[qname('mem:0')]).toEqual({
      'prov:collection': qname('bag'),
      'prov:entity': qname('sum'),
    });
  });

  it('encodes arbitrary lineage ids into a declared PROV namespace', () => {
    const doc = parseLineageDocument({
      format: 'lineage@1',
      entities: {
        'document:source with spaces': { kind: 'artifact' },
      },
      activities: {},
      agents: {},
      derivations: [],
      outputs: ['document:source with spaces'],
    });
    const prov = toProvJson(doc);
    const encoded = lineageIdToProvQualifiedName('document:source with spaces');
    expect(encoded).toMatch(/^lineage:id_[0-9a-f]+$/);
    expect(prov.prefix?.lineage).toBeDefined();
    expect(prov.entity?.[encoded]?.['lineage:id']).toBe('document:source with spaces');
  });
});
