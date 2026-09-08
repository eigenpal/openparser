import { expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as extract from './index';

const srcRoot = join(import.meta.dir);

function listRuntimeSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      files.push(...listRuntimeSourceFiles(path));
      continue;
    }
    if (!name.endsWith('.ts')) continue;
    if (name.endsWith('.test.ts')) continue;
    files.push(path);
  }
  return files;
}

test('@openparser/extract exposes grounded extraction APIs', () => {
  expect(extract).toHaveProperty('transformSchemaForGrounding');
  expect(extract).toHaveProperty('unwrapGroundedOutput');
  expect(extract).toHaveProperty('buildExtractionLineage');
  expect(extract).toHaveProperty('appendExtractionReviewLineage');
  expect(extract).toHaveProperty('normalizeStrictExtractionSchema');
  expect(extract).toHaveProperty('ExtractionGroundingResultSchema');
  expect(extract).toHaveProperty('renderGroundedDocument');
  expect(extract).toHaveProperty('runGroundedExtraction');
  expect(extract).toHaveProperty('composeExtractionUserMessage');
  expect(extract).toHaveProperty('composeExtractionInstruction');
  expect(extract).toHaveProperty('isGroundedExtractionSchemaSupported');
  expect(extract).toHaveProperty('truncateParsedDocumentToCharBudget');
  expect(extract).toHaveProperty('EXTRACT_PROMPT');
  expect(extract).toHaveProperty('GROUNDED_EXTRACT_PROMPT');
});

test('@openparser/extract does not export hosted provider or queue surfaces', () => {
  for (const forbidden of [
    'createOpenRouterExtractClient',
    'callOpenRouter',
    'providerErrorToAttemptDetails',
    'OcrWorkerLoop',
    'process.env',
  ]) {
    expect(extract).not.toHaveProperty(forbidden);
  }
});

test('@openparser/extract runtime sources avoid env reads and Eigenpal imports', () => {
  const violations: string[] = [];
  for (const file of listRuntimeSourceFiles(srcRoot)) {
    const rel = file.slice(srcRoot.length + 1);
    const source = readFileSync(file, 'utf8');
    if (/\bprocess\.env\b/.test(source)) {
      violations.push(`${rel}: reads process.env`);
    }
    if (/@eigenpal\//.test(source)) {
      violations.push(`${rel}: imports @eigenpal/*`);
    }
  }
  expect(violations).toEqual([]);
});

test('@openparser/extract depends only on OpenParser schema, lineage, zod, and AJV', () => {
  const pkg = JSON.parse(readFileSync(join(import.meta.dir, '../package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  expect(pkg.dependencies?.['@openparser/schema']).toBe('workspace:*');
  expect(pkg.dependencies?.['@openparser/lineage']).toBe('workspace:*');
  expect(pkg.dependencies?.zod).toBeDefined();
  expect(pkg.dependencies?.ajv).toBeDefined();
  expect(pkg.dependencies?.['ajv-formats']).toBeDefined();
  expect(pkg.dependencies?.['@eigenpal/types']).toBeUndefined();
  expect(pkg.dependencies?.['@eigenpal/config']).toBeUndefined();
  expect(pkg.dependencies?.['@eigenpal/openparser-service']).toBeUndefined();
});
