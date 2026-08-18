import { expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as lineage from './index';

function runtimeSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return runtimeSources(path);
    return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [path] : [];
  });
}

test('@openparser/lineage exposes the complete lineage@1 protocol surface', () => {
  expect(lineage.LINEAGE_FORMAT).toBe('lineage@1');
  expect(lineage).toHaveProperty('LineageDocumentSchema');
  expect(lineage).toHaveProperty('LineageBuilder');
  expect(lineage).toHaveProperty('validateLineageGraph');
  expect(lineage).toHaveProperty('entityAncestors');
  expect(lineage).toHaveProperty('ApprovalAssertionSchema');
  expect(lineage).toHaveProperty('fields');
  expect(lineage).toHaveProperty('fieldTrace');
  expect(lineage).toHaveProperty('toProvJson');
});

test('@openparser/lineage runtime has no document-extraction dependency', () => {
  const violations = runtimeSources(import.meta.dir).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return /['"](?:@eigenpal\/|@openparser\/schema)/.test(source) ? [file] : [];
  });
  expect(violations).toEqual([]);
});

test('lineage@1 itself knows nothing about OpenParser', () => {
  // The protocol is meant to be usable by producers that are not us. A vendor
  // attribute key read in the core is how that stops being true quietly: the
  // format keeps claiming neutrality while only one producer can satisfy it.
  // Anything keyed on `openparser:` belongs in the profile beside it.
  const profile = join(import.meta.dir, 'profile');
  const violations = runtimeSources(import.meta.dir)
    .filter((file) => !file.startsWith(profile))
    .filter((file) => /['"]openparser:/.test(readFileSync(file, 'utf8')));
  expect(violations).toEqual([]);
});

test('core activityLabel is name-or-type, not OpenParser vocabulary', () => {
  expect(lineage.activityLabel({ type: 'ocr' })).toBe('ocr');
  expect(lineage.activityLabel({ type: 'extract' })).toBe('extract');
  expect(lineage.activityLabel({ type: 'transform' })).toBe('transform');
  expect(lineage.activityLabel({ type: 'grounding_resolution' })).toBe('grounding_resolution');
  expect(lineage.activityLabel({ type: 'review.confirm' })).toBe('review.confirm');
  expect(lineage.activityLabel({ type: 'ocr', name: 'Tesseract pass' })).toBe('Tesseract pass');
});

test('OpenParser activity presentation labels live in the profile, not lineage@1', () => {
  // Distinctive display copy for OpenParser activity types. Generic type strings
  // such as `ocr` or `extract` are valid in neutral fixtures and must remain so.
  const profile = join(import.meta.dir, 'profile');
  const labels = [
    'Schema-constrained extraction',
    'Grounding resolution and validation',
    'Human review',
  ];
  const violations = runtimeSources(import.meta.dir)
    .filter((file) => !file.startsWith(profile))
    .flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return labels
        .filter((label) => source.includes(`'${label}'`) || source.includes(`"${label}"`))
        .map((label) => `${file}: ${label}`);
    });
  expect(violations).toEqual([]);
});
