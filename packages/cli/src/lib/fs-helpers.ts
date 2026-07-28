import { readFileSync } from 'fs';
import { basename } from 'path';

export function detectFileMediaType(content: Uint8Array): string {
  if (
    content.length >= 5 &&
    content[0] === 0x25 &&
    content[1] === 0x50 &&
    content[2] === 0x44 &&
    content[3] === 0x46 &&
    content[4] === 0x2d
  ) {
    return 'application/pdf';
  }
  if (
    content.length >= 8 &&
    content[0] === 0x89 &&
    content[1] === 0x50 &&
    content[2] === 0x4e &&
    content[3] === 0x47 &&
    content[4] === 0x0d &&
    content[5] === 0x0a &&
    content[6] === 0x1a &&
    content[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) {
    return 'image/jpeg';
  }
  return 'application/octet-stream';
}

export function readJsonFile(path: string): unknown {
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw);
}

export function readFileBlob(path: string): File {
  const content = readFileSync(path);
  const name = basename(path);
  return new File([content], name, { type: detectFileMediaType(content) });
}

export function parseOptionalJson(value: string | undefined, label: string): unknown | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}
