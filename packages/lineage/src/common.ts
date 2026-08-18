import { z } from 'zod';

/** Non-empty identifier used as a map key or cross-reference. */
export const LineageIdSchema = z.string().trim().min(1).max(512);
export type LineageId = z.infer<typeof LineageIdSchema>;

/** JSON-safe attribute bags and free-form parameter objects. */
export const JsonValueSchema = z.json();
export type JsonValue = z.infer<typeof JsonValueSchema>;

export const AttributesSchema = z.record(z.string().min(1), JsonValueSchema);
export type Attributes = z.infer<typeof AttributesSchema>;

/**
 * Structural equality for JSON values: whether two values say the same thing.
 * Object key order is not part of what a JSON value says, so it is normalised
 * away rather than compared.
 */
export function jsonValuesEqual(left: JsonValue, right: JsonValue): boolean {
  if (left === right) return true;
  if (left === null || right === null) return false;
  if (typeof left !== 'object' || typeof right !== 'object') return false;
  return canonicalJson(left) === canonicalJson(right);
}

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value)
    .filter(([, member]) => member !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, member]) => `${JSON.stringify(key)}:${canonicalJson(member as JsonValue)}`);
  return `{${entries.join(',')}}`;
}

/**
 * RFC 6901 JSON Pointer. The empty string addresses the whole document.
 * JSONPath is useful for queries, but pointers give lineage entities one
 * unambiguous location.
 */
export const JsonPointerSchema = z
  .string()
  .max(2048)
  .regex(/^(?:\/(?:[^~/]|~0|~1)*)*$/, 'path must be an RFC 6901 JSON Pointer');
export type JsonPointer = z.infer<typeof JsonPointerSchema>;

/** Wire format tag for this package. */
export const LINEAGE_FORMAT = 'lineage@1' as const;
export const LineageFormatSchema = z.literal(LINEAGE_FORMAT);
export type LineageFormat = z.infer<typeof LineageFormatSchema>;

/**
 * RFC 3339 timestamp string. Offset is required (`Z` or `±HH:mm`). Calendar
 * dates that are not real days are rejected rather than rolled over.
 * Start/end ordering is enforced at the document graph level.
 */
export const TimestampSchema = z.iso.datetime({ offset: true }).max(64);
export type Timestamp = z.infer<typeof TimestampSchema>;
