import { expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as adapters from './index';

const srcRoot = join(import.meta.dir);

function listRuntimeSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === 'test-fixtures') continue;
      files.push(...listRuntimeSourceFiles(path));
      continue;
    }
    if (!name.endsWith('.ts')) continue;
    if (name.endsWith('.test.ts')) continue;
    files.push(path);
  }
  return files;
}

test('@openparser/adapters does not export hosted routing policy', () => {
  for (const forbidden of [
    'MISTRAL_PUBLIC_MODEL_IDS',
    'AZURE_PUBLIC_MODEL_IDS',
    'GOOGLE_DOCAI_PINNED_PROCESSOR_VERSION',
    'featureTypesForModel',
    'HOSTED_OCR_MODELS',
  ]) {
    expect(adapters).not.toHaveProperty(forbidden);
  }
});

test('@openparser/adapters does not export hand-bumped converter version constants', () => {
  for (const forbidden of [
    'OCR_PARSE_CONVERTER_VERSION',
    'MISTRAL_OCR_CONVERTER_VERSION',
    'AZURE_DOCUMENT_INTELLIGENCE_CONVERTER_VERSION',
    'GOOGLE_DOCUMENT_AI_CONVERTER_VERSION',
    'AWS_TEXTRACT_CONVERTER_VERSION',
  ]) {
    expect(adapters).not.toHaveProperty(forbidden);
  }
  expect(typeof adapters.OPENPARSER_ADAPTERS_VERSION).toBe('string');
  expect(typeof adapters.openparserAdapterConverterVersion).toBe('function');
});

test('@openparser/adapters runtime sources avoid env reads and internal imports', () => {
  const violations: string[] = [];
  for (const file of listRuntimeSourceFiles(srcRoot)) {
    const rel = file.slice(srcRoot.length + 1);
    const source = readFileSync(file, 'utf8');
    if (/\bprocess\.env\b/.test(source)) {
      violations.push(`${rel}: reads process.env`);
    }
    if (/@eigenpal\/internal/.test(source)) {
      violations.push(`${rel}: imports @eigenpal/internal`);
    }
    if (/@eigenpal\/types\/openparser-api/.test(source)) {
      violations.push(`${rel}: imports @eigenpal/types/openparser-api`);
    }
    if (/@eigenpal\/config/.test(source) || /@eigenpal\/openparser-service/.test(source)) {
      violations.push(`${rel}: imports hosted package`);
    }
  }
  expect(violations).toEqual([]);
});

test('@openparser/adapters depends only on @openparser/schema for OpenParser types', () => {
  const pkg = JSON.parse(readFileSync(join(import.meta.dir, '../package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  expect(pkg.dependencies?.['@openparser/schema']).toBe('workspace:*');
  expect(pkg.dependencies?.zod).toBeDefined();
  expect(pkg.dependencies?.['@eigenpal/types/openparser-api']).toBeUndefined();
  expect(pkg.dependencies?.['@eigenpal/config']).toBeUndefined();
});
