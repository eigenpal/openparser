import {
  entityAncestors,
  fieldEntityByPointer,
  fields,
  type LineageDocument,
} from '@openparser/lineage';
import { describe, expect, test } from 'bun:test';
import { canonicalSha256 } from '../hash';
import { ReviewLineagePathError, appendExtractionReviewLineage } from './review-lineage';

const machineLineage: LineageDocument = {
  format: 'lineage@1',
  entities: {
    source: { kind: 'artifact' },
    total: {
      kind: 'value',
      path: '/total',
      value: 100,
    },
  },
  activities: {
    extract: { type: 'extract', status: 'ended' },
  },
  agents: {},
  derivations: [
    {
      id: 'derive-total',
      output: 'total',
      activity: 'extract',
      inputs: [{ entity: 'source', effect: 'direct' }],
    },
  ],
  relations: [],
  outputs: ['total'],
};

describe('appendExtractionReviewLineage', () => {
  test('appends confirmations and completion without changing machine entities', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: machineLineage,
      correctedOutput: { total: 125 },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          previous_value: 100,
          value: 125,
        },
        {
          version: 2,
          type: 'approved',
          actor_id: 'user-2',
          created_at: '2026-08-05T18:01:00.000Z',
          note: 'Checked against the invoice.',
        },
      ],
    });

    expect(lineage.entities.total?.value).toBe(100);
    expect(lineage.entities['review:value:1:0']).toMatchObject({
      kind: 'value',
      path: '/total',
      value: 125,
      attributes: { 'openparser:reviewEvent': 'field_confirmed' },
    });
    expect(lineage.activities['activity:review-confirm:1:0']?.type).toBe('review.confirm');
    expect(lineage.entities['review:value:1:0']?.approvals).toEqual([
      { agent: 'agent:reviewer:user-1', at: '2026-08-05T18:00:00.000Z' },
    ]);
    expect(lineage.entities['review:decision:2:1']).toMatchObject({
      kind: 'decision',
      value: 'approved',
    });
    expect(entityAncestors(lineage, 'review:decision:2:1')).toEqual(
      expect.arrayContaining(['source', 'total', 'review:value:1:0', 'review:output:2'])
    );
    expect(lineage.outputs).toEqual(['review:value:1:0', 'review:output:2', 'review:decision:2:1']);
    expect(lineage.entities['review:output:2']).toMatchObject({
      path: '',
      digest: { algorithm: 'sha256', value: canonicalSha256({ total: 125 }) },
    });
    expect(lineage.entities['review:output:2']).not.toHaveProperty('value');
    expect(Object.keys(lineage.agents).sort()).toEqual([
      'agent:reviewer:user-1',
      'agent:reviewer:user-2',
    ]);
  });

  test('a withdrawn sign-off mints no decision, and a later one stands alone', () => {
    const approved = {
      version: 1,
      type: 'approved',
      actor_id: 'user-1',
      created_at: '2026-08-05T18:00:00.000Z',
    } as const;
    const reopened = {
      version: 2,
      type: 'completion_retracted',
      actor_id: 'user-1',
      created_at: '2026-08-05T18:01:00.000Z',
    } as const;

    const withdrawn = appendExtractionReviewLineage({
      lineage: machineLineage,
      correctedOutput: { total: 100 },
      events: [approved, reopened],
    });
    // Nothing was confirmed and nothing stands signed off, so the graph is the
    // machine graph again — no snapshot, no decision.
    expect(withdrawn.entities).not.toHaveProperty('review:decision:1:0');
    expect(withdrawn.entities).not.toHaveProperty('review:output:2');
    expect(withdrawn.outputs).toEqual(['total']);

    const signedAgain = appendExtractionReviewLineage({
      lineage: machineLineage,
      correctedOutput: { total: 100 },
      events: [
        approved,
        reopened,
        {
          version: 3,
          type: 'rejected',
          actor_id: 'user-2',
          created_at: '2026-08-05T18:02:00.000Z',
        },
      ],
    });
    expect(signedAgain.entities['review:decision:3:2']).toMatchObject({
      kind: 'decision',
      value: 'rejected',
    });
    expect(signedAgain.entities).not.toHaveProperty('review:decision:1:0');
    expect(signedAgain.outputs).toEqual(['total', 'review:output:3', 'review:decision:3:2']);
  });

  test('keeps the original graph object unchanged', () => {
    appendExtractionReviewLineage({
      lineage: machineLineage,
      correctedOutput: { total: 125 },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          value: 125,
        },
      ],
    });

    expect(machineLineage.entities).not.toHaveProperty('review:value:1:0');
    expect(machineLineage.outputs).toEqual(['total']);
  });

  test('gives every confirmation in one review version a stable unique identity', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: {
        ...machineLineage,
        entities: {
          ...machineLineage.entities,
          currency: {
            kind: 'value',
            path: '/currency',
            value: 'EUR',
          },
        },
        outputs: ['total', 'currency'],
      },
      correctedOutput: { total: 125, currency: 'USD' },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          value: 125,
        },
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/currency',
          value: 'USD',
        },
      ],
    });

    expect(lineage.entities['review:value:1:0']?.value).toBe(125);
    expect(lineage.entities['review:value:1:1']?.value).toBe('USD');
    expect(lineage.outputs).toEqual(['review:value:1:0', 'review:value:1:1', 'review:output:1']);
    expect(entityAncestors(lineage, 'review:output:1')).toEqual(
      expect.arrayContaining(['review:value:1:0', 'review:value:1:1'])
    );
  });

  test('records confirmations of object paths from their prior descendant values', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: {
        format: 'lineage@1',
        entities: {
          source: { kind: 'artifact' },
          amount: {
            kind: 'value',
            path: '/invoice/amount',
            value: 100,
          },
          currency: {
            kind: 'value',
            path: '/invoice/currency',
            value: 'EUR',
          },
        },
        activities: { extract: { type: 'extract' } },
        agents: {},
        derivations: [
          {
            id: 'derive-amount',
            output: 'amount',
            activity: 'extract',
            inputs: [{ entity: 'source', effect: 'direct' }],
          },
          {
            id: 'derive-currency',
            output: 'currency',
            activity: 'extract',
            inputs: [{ entity: 'source', effect: 'direct' }],
          },
        ],
        relations: [],
        outputs: ['amount', 'currency'],
      },
      correctedOutput: { invoice: { amount: 125, currency: 'USD' } },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/invoice',
          value: { amount: 125, currency: 'USD' },
        },
      ],
    });

    expect(lineage.entities['review:value:1:0:0']).toMatchObject({
      kind: 'value',
      path: '/invoice/amount',
      value: 125,
    });
    expect(lineage.entities['review:value:1:0:1']).toMatchObject({
      kind: 'value',
      path: '/invoice/currency',
      value: 'USD',
    });
    expect(entityAncestors(lineage, 'review:value:1:0:0')).toContain('amount');
    expect(entityAncestors(lineage, 'review:value:1:0:1')).toContain('currency');
    expect(entityAncestors(lineage, 'review:output:1')).toEqual(
      expect.arrayContaining(['review:value:1:0:0', 'review:value:1:0:1'])
    );
  });

  test('keeps sibling provenance when a parent confirmation is followed by a child confirmation', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: {
        format: 'lineage@1',
        entities: {
          source: { kind: 'artifact' },
          amount: { kind: 'value', path: '/invoice/amount', value: 100 },
          currency: { kind: 'value', path: '/invoice/currency', value: 'EUR' },
        },
        activities: { extract: { type: 'extract' } },
        agents: {},
        derivations: [
          {
            id: 'derive-amount',
            output: 'amount',
            activity: 'extract',
            inputs: [{ entity: 'source', effect: 'direct' }],
          },
          {
            id: 'derive-currency',
            output: 'currency',
            activity: 'extract',
            inputs: [{ entity: 'source', effect: 'direct' }],
          },
        ],
        relations: [],
        outputs: ['amount', 'currency'],
      },
      correctedOutput: { invoice: { amount: 130, currency: 'USD' } },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/invoice',
          value: { amount: 125, currency: 'USD' },
        },
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/invoice/amount',
          value: 130,
        },
      ],
    });

    const ancestors = entityAncestors(lineage, 'review:output:1');
    expect(ancestors).toContain('review:value:1:1');
    expect(ancestors).toContain('review:value:1:0:1');
    expect(
      lineage.derivations
        .find((entry) => entry.output === 'review:output:1')
        ?.inputs.map((input) => input.entity)
    ).not.toContain('review:value:1:0:0');
    expect(lineage.entities['review:value:1:1']?.path).toBe('/invoice/amount');
    expect(lineage.entities['review:value:1:0:1']?.path).toBe('/invoice/currency');
  });

  test('rejects confirmations that cannot be connected to a lineage entity', () => {
    expect(() =>
      appendExtractionReviewLineage({
        lineage: machineLineage,
        correctedOutput: { total: 100, missing: true },
        events: [
          {
            version: 1,
            type: 'field_confirmed',
            actor_id: 'user-1',
            created_at: '2026-08-05T18:00:00.000Z',
            path: '/missing',
            value: true,
          },
        ],
      })
    ).toThrow(ReviewLineagePathError);
  });

  test('a no-op confirmation records a sign-off without minting a value change', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: machineLineage,
      correctedOutput: { total: 100 },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          previous_value: 100,
          value: 100,
          note: 'Looks right.',
        },
      ],
    });

    const agentId = 'agent:reviewer:user-1';
    expect(lineage.entities).not.toHaveProperty('review:value:1:0');
    expect(lineage.activities).not.toHaveProperty('activity:review-confirm:1:0');
    expect(lineage.outputs).toEqual(['total']);
    expect(lineage.agents[agentId]).toEqual({ type: 'human', name: 'user-1' });
    expect(lineage.entities.total?.approvals).toEqual([
      {
        agent: agentId,
        at: '2026-08-05T18:00:00.000Z',
        note: 'Looks right.',
      },
    ]);
  });

  test('confirming a different value drops the earlier approver', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: machineLineage,
      correctedOutput: { total: 125 },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          previous_value: 100,
          value: 100,
        },
        {
          version: 2,
          type: 'field_confirmed',
          actor_id: 'user-2',
          created_at: '2026-08-05T18:01:00.000Z',
          path: '/total',
          previous_value: 100,
          value: 125,
        },
      ],
    });

    const current = lineage.entities['review:value:2:1'];
    expect(current?.value).toBe(125);
    expect(current?.approvals).toEqual([
      { agent: 'agent:reviewer:user-2', at: '2026-08-05T18:01:00.000Z' },
    ]);
    expect(lineage.entities.total).not.toHaveProperty('approvals');
  });

  test('confirming the value a path already holds accumulates a second approver', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: machineLineage,
      correctedOutput: { total: 100 },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          previous_value: 100,
          value: 100,
        },
        {
          version: 2,
          type: 'field_confirmed',
          actor_id: 'user-2',
          created_at: '2026-08-05T18:00:01.000Z',
          path: '/total',
          previous_value: 100,
          value: 100,
        },
      ],
    });

    expect(lineage.entities.total?.approvals).toEqual([
      { agent: 'agent:reviewer:user-1', at: '2026-08-05T18:00:00.000Z' },
      { agent: 'agent:reviewer:user-2', at: '2026-08-05T18:00:01.000Z' },
    ]);
    expect(lineage.entities).not.toHaveProperty('review:value:1:0');
    expect(lineage.outputs).toEqual(['total']);
  });

  test('the same agent confirming twice keeps one assertion with the later sign-off', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: machineLineage,
      correctedOutput: { total: 100 },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          previous_value: 100,
          value: 100,
          note: 'First look.',
        },
        {
          version: 2,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:01:00.000Z',
          path: '/total',
          previous_value: 100,
          value: 100,
          note: 'Checked again.',
        },
      ],
    });

    expect(lineage.entities.total?.approvals).toEqual([
      {
        agent: 'agent:reviewer:user-1',
        at: '2026-08-05T18:01:00.000Z',
        note: 'Checked again.',
      },
    ]);
    expect(Object.keys(lineage.agents)).toEqual(['agent:reviewer:user-1']);
    expect(lineage.outputs).toEqual(['total']);
  });

  test('the review snapshot carries a digest instead of the corrected output', () => {
    const correctedOutput = { total: 125, currency: 'USD' };
    const lineage = appendExtractionReviewLineage({
      lineage: {
        ...machineLineage,
        entities: {
          ...machineLineage.entities,
          currency: { kind: 'value', path: '/currency', value: 'EUR' },
        },
        outputs: ['total', 'currency'],
      },
      correctedOutput,
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          value: 125,
        },
      ],
    });

    const snapshot = lineage.entities['review:output:1'];
    expect(snapshot).toMatchObject({
      kind: 'value',
      path: '',
      digest: { algorithm: 'sha256', value: canonicalSha256(correctedOutput) },
      attributes: { 'openparser:reviewVersion': 1 },
    });
    expect(snapshot).not.toHaveProperty('value');
  });

  test('rejects sign-offs that cannot be connected to a lineage entity', () => {
    expect(() =>
      appendExtractionReviewLineage({
        lineage: machineLineage,
        correctedOutput: { total: 100, missing: true },
        events: [
          {
            version: 1,
            type: 'field_confirmed',
            actor_id: 'user-1',
            created_at: '2026-08-05T18:00:00.000Z',
            path: '/missing',
            previous_value: true,
            value: true,
          },
        ],
      })
    ).toThrow(ReviewLineagePathError);
  });

  test('a sign-off adds no entities, activities, or derivations', () => {
    const entityCount = Object.keys(machineLineage.entities).length;
    const activityCount = Object.keys(machineLineage.activities).length;
    const derivationCount = machineLineage.derivations.length;
    const outputs = [...machineLineage.outputs];

    const lineage = appendExtractionReviewLineage({
      lineage: machineLineage,
      correctedOutput: { total: 100 },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          previous_value: 100,
          value: 100,
        },
      ],
    });

    expect(Object.keys(lineage.entities)).toHaveLength(entityCount);
    expect(Object.keys(lineage.activities)).toHaveLength(activityCount);
    expect(lineage.derivations).toHaveLength(derivationCount);
    expect(lineage.outputs).toEqual(outputs);
  });

  test('one human across several review actions is a single agent node', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: {
        ...machineLineage,
        entities: {
          ...machineLineage.entities,
          currency: {
            kind: 'value',
            path: '/currency',
            value: 'EUR',
          },
        },
        outputs: ['total', 'currency'],
      },
      correctedOutput: { total: 125, currency: 'USD' },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          value: 125,
        },
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:01.000Z',
          path: '/currency',
          value: 'USD',
        },
        {
          version: 1,
          type: 'approved',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:03.000Z',
        },
      ],
    });

    expect(Object.keys(lineage.agents)).toEqual(['agent:reviewer:user-1']);
    expect(lineage.agents['agent:reviewer:user-1']).toEqual({ type: 'human', name: 'user-1' });
  });

  test('actors that would collide after sanitization stay distinct agent nodes', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: {
        ...machineLineage,
        entities: {
          ...machineLineage.entities,
          currency: {
            kind: 'value',
            path: '/currency',
            value: 'EUR',
          },
        },
        outputs: ['total', 'currency'],
      },
      correctedOutput: { total: 125, currency: 'USD' },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user@a',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          value: 125,
        },
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user#a',
          created_at: '2026-08-05T18:00:01.000Z',
          path: '/currency',
          value: 'USD',
        },
      ],
    });

    const agentIds = Object.keys(lineage.agents);
    expect(agentIds).toHaveLength(2);
    expect(agentIds.every((id) => id.startsWith('agent:reviewer:user_a-'))).toBe(true);
    expect(new Set(agentIds).size).toBe(2);
    expect(new Set(Object.values(lineage.agents).map((agent) => agent.name))).toEqual(
      new Set(['user@a', 'user#a'])
    );
  });

  test('after a correction fields() lists every field and omits the root snapshot', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: {
        ...machineLineage,
        entities: {
          ...machineLineage.entities,
          currency: {
            kind: 'value',
            path: '/currency',
            value: 'EUR',
          },
        },
        outputs: ['total', 'currency'],
      },
      correctedOutput: { total: 125, currency: 'EUR' },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          value: 125,
        },
      ],
    });

    expect(lineage.outputs).toEqual(['review:value:1:0', 'currency', 'review:output:1']);
    expect(
      fields(lineage).map((field) => ({ id: field.id, pointer: field.pointer, value: field.value }))
    ).toEqual([
      { id: 'review:value:1:0', pointer: '/total', value: 125 },
      { id: 'currency', pointer: '/currency', value: 'EUR' },
    ]);
  });

  test('fieldEntityByPointer returns the corrected entity and its approval', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: machineLineage,
      correctedOutput: { total: 125 },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          previous_value: 100,
          value: 125,
        },
      ],
    });

    const current = fieldEntityByPointer(lineage, '/total');
    expect(current?.id).toBe('review:value:1:0');
    expect(current?.entity.value).toBe(125);
    expect(current?.entity.approvals).toEqual([
      { agent: 'agent:reviewer:user-1', at: '2026-08-05T18:00:00.000Z' },
    ]);
    expect(lineage.entities.total?.value).toBe(100);
  });

  test('a retracted tip disappears and outputs point at the predecessor', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: machineLineage,
      correctedOutput: { total: 100 },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          previous_value: 100,
          value: 125,
        },
        {
          version: 2,
          type: 'field_confirmation_retracted',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:01:00.000Z',
          path: '/total',
        },
      ],
    });

    expect(lineage.entities).not.toHaveProperty('review:value:1:0');
    expect(lineage.activities).not.toHaveProperty('activity:review-confirm:1:0');
    expect(lineage.derivations.some((entry) => entry.output === 'review:value:1:0')).toBe(false);
    expect(lineage.outputs).toEqual(['total']);
    expect(fieldEntityByPointer(lineage, '/total')?.id).toBe('total');
  });

  test('retracting the later of two confirmations leaves a contiguous chain', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: machineLineage,
      correctedOutput: { total: 125 },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          previous_value: 100,
          value: 125,
        },
        {
          version: 2,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:01:00.000Z',
          path: '/total',
          previous_value: 125,
          value: 140,
        },
        {
          version: 3,
          type: 'field_confirmation_retracted',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:02:00.000Z',
          path: '/total',
        },
      ],
    });

    expect(lineage.entities).not.toHaveProperty('review:value:2:1');
    expect(lineage.entities['review:value:1:0']?.value).toBe(125);
    expect(lineage.outputs).toEqual(['review:value:1:0', 'review:output:3']);
    expect(fieldEntityByPointer(lineage, '/total')?.id).toBe('review:value:1:0');
    expect(entityAncestors(lineage, 'review:value:1:0')).toEqual(
      expect.arrayContaining(['source', 'total'])
    );
  });

  test('a retracted confirmation does not leave an approval on the predecessor', () => {
    const lineage = appendExtractionReviewLineage({
      lineage: machineLineage,
      correctedOutput: { total: 100 },
      events: [
        {
          version: 1,
          type: 'field_confirmed',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:00:00.000Z',
          path: '/total',
          previous_value: 100,
          value: 125,
        },
        {
          version: 2,
          type: 'field_confirmation_retracted',
          actor_id: 'user-1',
          created_at: '2026-08-05T18:01:00.000Z',
          path: '/total',
        },
      ],
    });

    expect(lineage.entities.total).not.toHaveProperty('approvals');
    expect(lineage.entities).not.toHaveProperty('review:value:1:0');
  });
});
