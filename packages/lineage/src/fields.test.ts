import { describe, expect, it } from 'bun:test';
import {
  LINEAGE_FORMAT,
  activityLabel,
  dottedPathFromPointer,
  fieldEntityByPointer,
  fieldTrace,
  fields,
  parseLineageDocument,
  pointerFromDottedPath,
} from './index';

function sampleDoc() {
  return parseLineageDocument({
    format: LINEAGE_FORMAT,
    entities: {
      source: { kind: 'artifact', name: 'page.png' },
      span: { kind: 'evidence', name: 'vendor-span' },
      bag: { kind: 'collection', name: 'ocr-tokens' },
      amount: {
        kind: 'value',
        path: '/amount',
        value: 42,
        confidence: [
          {
            score: 0.4,
            scale: { min: 0, max: 1 },
            kind: 'reported',
            scope: 'recognition',
          },
          {
            score: 0.91,
            scale: { min: 0, max: 1 },
            kind: 'derived',
            scope: 'extraction',
          },
        ],
      },
      vendor: {
        kind: 'value',
        path: '/vendor',
        value: 'Acme',
        confidence: [
          {
            score: 0.7,
            scale: { min: 0, max: 1 },
            kind: 'reported',
            scope: 'recognition',
          },
        ],
      },
    },
    activities: {
      ocr: { type: 'ocr' },
      group: { type: 'group' },
      extract: { type: 'extract' },
    },
    derivations: [
      {
        id: 'd-ocr',
        output: 'span',
        activity: 'ocr',
        inputs: [{ entity: 'source', effect: 'direct' }],
      },
      {
        id: 'd-group',
        output: 'bag',
        activity: 'group',
        inputs: [{ entity: 'span', effect: 'direct' }],
      },
      {
        id: 'd-amount',
        output: 'amount',
        activity: 'extract',
        inputs: [{ entity: 'bag', effect: 'direct' }],
      },
      {
        id: 'd-vendor',
        output: 'vendor',
        activity: 'extract',
        inputs: [{ entity: 'bag', effect: 'direct' }],
      },
    ],
    outputs: ['vendor', 'amount'],
  });
}

describe('fields', () => {
  it('returns output entities in outputs order with pointer and confidence', () => {
    const doc = sampleDoc();
    const listed = fields(doc);
    expect(listed.map((field) => field.id)).toEqual(['vendor', 'amount']);
    expect(listed[0]!.pointer).toBe('/vendor');
    expect(listed[0]!.value).toBe('Acme');
    expect(listed[0]!.confidence?.scope).toBe('recognition');
    expect(listed[0]!.confidence?.score).toBe(0.7);
    expect(listed[0]!.entity).toBe(doc.entities.vendor);
    expect(listed[1]!.pointer).toBe('/amount');
    expect(listed[1]!.value).toBe(42);
    expect(listed[1]!.confidence?.scope).toBe('extraction');
    expect(listed[1]!.confidence?.score).toBe(0.91);
    expect(listed[1]!.entity).toBe(doc.entities.amount);
  });

  it('omits the whole-document snapshot and lists current field values', () => {
    const doc = parseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: {
        machine: { kind: 'decision', path: '/total', value: 100 },
        corrected: {
          kind: 'value',
          path: '/total',
          value: 125,
          approvals: [{ agent: 'agent:reviewer:user-1', at: '2026-08-05T18:00:00.000Z' }],
        },
        currency: { kind: 'value', path: '/currency', value: 'EUR' },
        snapshot: { kind: 'value', name: 'Corrected output', path: '', value: { total: 125 } },
        verdict: { kind: 'decision', name: 'Extraction approved', value: 'approved' },
      },
      activities: { extract: { type: 'extract' } },
      agents: { 'agent:reviewer:user-1': { type: 'human' } },
      derivations: [],
      outputs: ['corrected', 'currency', 'snapshot', 'verdict'],
    });
    expect(
      fields(doc).map((field) => ({ id: field.id, pointer: field.pointer, value: field.value }))
    ).toEqual([
      { id: 'corrected', pointer: '/total', value: 125 },
      { id: 'currency', pointer: '/currency', value: 'EUR' },
    ]);
    expect(fieldTrace(doc, '/total')?.field.id).toBe('corrected');
    expect(fieldTrace(doc, '')).toBeUndefined();
  });
});

describe('fieldTrace', () => {
  it('returns collection/evidence ancestors and distinct activity ids', () => {
    const doc = sampleDoc();
    const trace = fieldTrace(doc, '/amount');
    expect(trace).toBeDefined();
    expect(trace!.field.id).toBe('amount');
    expect(trace!.evidence.map((item) => item.id)).toEqual(['bag', 'span']);
    expect(trace!.evidence.map((item) => item.entity.kind)).toEqual(['collection', 'evidence']);
    expect(trace!.activities).toEqual(['extract', 'group', 'ocr']);
  });

  it('returns undefined for an unknown pointer', () => {
    expect(fieldTrace(sampleDoc(), '/missing')).toBeUndefined();
  });
});

describe('pointer helpers', () => {
  // Both directions are used to look entities up by path, so mismatched
  // escaping would not throw — field provenance would just come back empty.
  it('round-trips pointers whose segments contain escapable characters', () => {
    for (const pointer of ['/vendor', '/line~1items/0/total', '/odd~0key', '/a/b/c']) {
      expect(pointerFromDottedPath(dottedPathFromPointer(pointer))).toBe(pointer);
    }
  });

  it('prefers the settled decision over a candidate at the same path', () => {
    const doc = parseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: {
        candidate: { kind: 'value', path: '/total', value: 1 },
        settled: { kind: 'decision', path: '/total', value: 2 },
      },
      activities: { extract: { type: 'extract' } },
      derivations: [],
      outputs: ['settled'],
    });
    expect(fieldEntityByPointer(doc, '/total')?.id).toBe('settled');
    expect(fieldEntityByPointer(doc, '/absent')).toBeUndefined();
  });

  it('prefers the current outputs entity over a superseded machine decision', () => {
    const doc = parseLineageDocument({
      format: LINEAGE_FORMAT,
      entities: {
        machine: { kind: 'decision', path: '/total', value: 100 },
        corrected: {
          kind: 'value',
          path: '/total',
          value: 125,
          approvals: [{ agent: 'agent:reviewer:user-1', at: '2026-08-05T18:00:00.000Z' }],
        },
        snapshot: { kind: 'value', path: '', value: { total: 125 } },
      },
      activities: { extract: { type: 'extract' } },
      agents: { 'agent:reviewer:user-1': { type: 'human' } },
      derivations: [],
      outputs: ['corrected', 'snapshot'],
    });
    const current = fieldEntityByPointer(doc, '/total');
    expect(current?.id).toBe('corrected');
    expect(current?.entity.value).toBe(125);
    expect(current?.entity.approvals).toEqual([
      { agent: 'agent:reviewer:user-1', at: '2026-08-05T18:00:00.000Z' },
    ]);
  });
});

describe('activityLabel', () => {
  it('uses an explicit name when present and otherwise the raw type', () => {
    expect(activityLabel({ type: 'ocr' })).toBe('ocr');
    expect(activityLabel({ type: 'extract' })).toBe('extract');
    expect(activityLabel({ type: 'review.confirm' })).toBe('review.confirm');
    expect(activityLabel({ type: 'ocr', name: 'Tesseract pass' })).toBe('Tesseract pass');
    expect(activityLabel({ type: 'acme.redaction' })).toBe('acme.redaction');
  });
});
