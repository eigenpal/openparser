import { readFileSync } from 'fs';
import { basename } from 'path';

export function readJsonFile(path: string): unknown {
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw);
}

export function readFileBlob(path: string): File {
  const content = readFileSync(path);
  const name = basename(path);
  return new File([content], name);
}

export function parseOptionalJson(value: string | undefined, label: string): unknown | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}
