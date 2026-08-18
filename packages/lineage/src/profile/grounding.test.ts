import { describe, expect, it } from 'bun:test';

import { LINEAGE_FORMAT } from '../common';
import { parseLineageDocument } from '../document';
import { fieldGrounding } from './grounding';

function doc(options: { evidence: boolean; dropped?: string[] }) {
  const dropped = options.dropped;
  return parseLineageDocument({
    format: LINEAGE_FORMAT,
    entities: {
      region: { kind: 'evidence', value: 'Total 42' },
      total: { kind: 'value', path: '/total', value: 42 },
    },
    activities: { extract: { type: 'extract' } },
    derivations: [
      {
        id: 'd-total',
        output: 'total',
        activity: 'extract',
        inputs: options.evidence ? [{ entity: 'region', effect: 'direct' }] : [],
        ...(dropped ? { attributes: { 'openparser:droppedSourceIds': dropped } } : {}),
      },
    ],
    outputs: ['total'],
  });
}

describe('fieldGrounding', () => {
  it('is grounded when the field reaches evidence and every cited source resolved', () => {
    expect(fieldGrounding(doc({ evidence: true }), '/total')).toEqual({
      status: 'grounded',
      droppedSourceIds: [],
    });
  });

  // A model that names five regions and gets three is not as backed as one that
  // got all five, and the difference is only visible on the producer's own record.
  it('is partial when the producer could not resolve a source it cited', () => {
    expect(fieldGrounding(doc({ evidence: true, dropped: ['blk_9'] }), '/total')).toEqual({
      status: 'partial',
      droppedSourceIds: ['blk_9'],
    });
  });

  it('is ungrounded when the field reaches no evidence at all', () => {
    expect(fieldGrounding(doc({ evidence: false }), '/total')?.status).toBe('ungrounded');
  });

  it('is undefined for a pointer that names no field', () => {
    expect(fieldGrounding(doc({ evidence: true }), '/missing')).toBeUndefined();
  });

  it('is partial when a rewrite ancestor could not resolve a cited source', () => {
    const lineage = parseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: {
        region: { kind: 'evidence', value: 'Total 42' },
        'source-text:/total': { kind: 'value', value: 'Total 42' },
        total: { kind: 'value', path: '/total', value: 42 },
        other: { kind: 'value', path: '/other', value: 9 },
      },
      activities: { extract: { type: 'extract' }, transform: { type: 'transform' } },
      derivations: [
        {
          output: 'source-text:/total',
          activity: 'extract',
          inputs: [{ entity: 'region', effect: 'direct' }],
          attributes: { 'openparser:droppedSourceIds': ['blk_9'] },
        },
        {
          output: 'total',
          activity: 'transform',
          inputs: [{ entity: 'source-text:/total', effect: 'direct' }],
        },
        {
          output: 'other',
          activity: 'extract',
          inputs: [{ entity: 'region', effect: 'direct' }],
          attributes: { 'openparser:droppedSourceIds': ['blk_unrelated'] },
        },
      ],
      outputs: ['total', 'other'],
    });

    expect(fieldGrounding(lineage, '/total')).toEqual({
      status: 'partial',
      droppedSourceIds: ['blk_9'],
    });
  });

  it('stays partial through a reviewed correction when the extract ancestor dropped a source', () => {
    const lineage = parseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: {
        region: { kind: 'evidence', value: 'Total 42' },
        machine: { kind: 'decision', path: '/total', value: 100 },
        'source-text:/total': { kind: 'value', value: 'Total 42' },
        total: { kind: 'value', path: '/total', value: 100 },
        corrected: {
          kind: 'value',
          path: '/total',
          value: 125,
          approvals: [{ agent: 'agent:reviewer:user-1', at: '2026-08-05T18:00:00.000Z' }],
        },
      },
      activities: {
        extract: { type: 'extract' },
        transform: { type: 'transform' },
        'review.confirm': { type: 'review.confirm' },
      },
      agents: { 'agent:reviewer:user-1': { type: 'human' } },
      derivations: [
        {
          output: 'source-text:/total',
          activity: 'extract',
          inputs: [{ entity: 'region', effect: 'direct' }],
          attributes: { 'openparser:droppedSourceIds': ['blk_9'] },
        },
        {
          output: 'total',
          activity: 'transform',
          inputs: [{ entity: 'source-text:/total', effect: 'direct' }],
        },
        {
          output: 'corrected',
          activity: 'review.confirm',
          inputs: [{ entity: 'total', effect: 'direct' }],
        },
      ],
      outputs: ['corrected'],
    });

    expect(fieldGrounding(lineage, '/total')).toEqual({
      status: 'partial',
      droppedSourceIds: ['blk_9'],
    });
  });

  it('deduplicates dropped source ids across ancestor derivations', () => {
    const lineage = parseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: {
        region: { kind: 'evidence', value: 'Total 42' },
        'source-text:/total': { kind: 'value', value: 'Total 42' },
        total: { kind: 'value', path: '/total', value: 42 },
      },
      activities: { extract: { type: 'extract' }, transform: { type: 'transform' } },
      derivations: [
        {
          output: 'source-text:/total',
          activity: 'extract',
          inputs: [{ entity: 'region', effect: 'direct' }],
          attributes: { 'openparser:droppedSourceIds': ['blk_9', 'blk_9'] },
        },
        {
          output: 'total',
          activity: 'transform',
          inputs: [{ entity: 'source-text:/total', effect: 'direct' }],
          attributes: { 'openparser:droppedSourceIds': ['blk_9'] },
        },
      ],
      outputs: ['total'],
    });

    expect(fieldGrounding(lineage, '/total')?.droppedSourceIds).toEqual(['blk_9']);
  });
});
