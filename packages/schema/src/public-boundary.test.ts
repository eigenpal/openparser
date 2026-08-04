import { expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as schema from './index';

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

test('@openparser/schema exports only document/raw OCR representation', () => {
  for (const forbidden of [
    'ParseRequestSchema',
    'JobSchema',
    'OPENPARSER_COMPONENT_SCHEMAS',
    'OcrModelCatalogEntrySchema',
    'ExtractionPipelineSchema',
    'buildParseCurl',
    'normalizeOcrJobIdInput',
    'findOverlappingTableCellIds',
    'tableCellOverlapSweepStats',
    'MAX_TABLE_CELL_ROW_COVERAGE',
    'TableCellOverlapRect',
    'TableCellOverlapResult',
  ]) {
    expect(schema).not.toHaveProperty(forbidden);
  }
  expect(schema).toHaveProperty('ParsedDocumentSchema');
  expect(schema).toHaveProperty('RawParseResultSchema');
  expect(schema).toHaveProperty('OcrOutputFormatSchema');
});

test('@openparser/schema sources do not import private wire', () => {
  const violations: string[] = [];
  for (const file of listRuntimeSourceFiles(srcRoot)) {
    const rel = file.slice(srcRoot.length + 1);
    const source = readFileSync(file, 'utf8');
    if (/(?:from|import)\s+['"]@eigenpal\/types\/openparser-api['"]/.test(source)) {
      violations.push(`${rel}: imports @eigenpal/types/openparser-api`);
    }
  }
  expect(violations).toEqual([]);
});
