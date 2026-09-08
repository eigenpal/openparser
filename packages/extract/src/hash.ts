import { createHash } from 'node:crypto';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
}

/** SHA-256 hex digest of a key-sorted JSON encoding. */
export function canonicalSha256(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}
