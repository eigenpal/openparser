/**
 * Bijective JSON Pointer ↔ dotted UI path encoding.
 *
 * Segments are joined with `.`. Literal `.` and `~` inside a segment name are
 * escaped after RFC 6901 tilde rules so a key containing `~2` (`~02`) never
 * collides with an escaped dot (`~2`). `/` does not need dotted-layer escaping
 * because `.` is the only segment separator.
 *
 * Ordinary keys without `.` or `~` round-trip unchanged (`vendor`, `items.0.amount`).
 */

const DOTTED_SEGMENT_DOT = '~2';
const JSON_POINTER_ESCAPE = /~(?:0|1)/g;
const INVALID_JSON_POINTER_ESCAPE = /~(?![01])/;
const INVALID_DOTTED_PATH_ESCAPE = /~(?![02])/;

/** Escape one dotted-path segment for joining with `.`. */
export function encodeDottedPathSegment(segment: string): string {
  return segment.replaceAll('~', '~0').replaceAll('.', DOTTED_SEGMENT_DOT);
}

/** Decode one dotted-path segment produced by {@link encodeDottedPathSegment}. */
export function decodeDottedPathSegment(segment: string): string {
  if (INVALID_DOTTED_PATH_ESCAPE.test(segment)) {
    throw new Error(`Invalid dotted path escape in segment "${segment}"`);
  }
  let decoded = '';
  for (let index = 0; index < segment.length; index += 1) {
    if (segment[index] === '~' && index + 1 < segment.length) {
      const code = segment[index + 1];
      if (code === '0') {
        decoded += '~';
        index += 1;
        continue;
      }
      if (code === '2') {
        decoded += '.';
        index += 1;
        continue;
      }
    }
    decoded += segment[index];
  }
  return decoded;
}

/** Split a dotted UI path into decoded segment names. */
export function parseDottedPathSegments(path: string): string[] {
  return path.split('.').filter(Boolean).map(decodeDottedPathSegment);
}

function encodeJsonPointerSegment(segment: string): string {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1');
}

function decodeJsonPointerSegment(segment: string): string {
  if (INVALID_JSON_POINTER_ESCAPE.test(segment)) {
    throw new Error(`Invalid JSON Pointer escape in segment "${segment}"`);
  }
  return segment.replace(JSON_POINTER_ESCAPE, (escape) => (escape === '~1' ? '/' : '~'));
}

/** RFC 6901 pointer to bijective dotted UI path. */
export function dottedPathFromPointer(pointer: string): string {
  if (pointer === '' || pointer === '/') return '';
  return pointer
    .slice(1)
    .split('/')
    .map(decodeJsonPointerSegment)
    .map(encodeDottedPathSegment)
    .join('.');
}

/** Bijective dotted UI path back to an RFC 6901 pointer. */
export function pointerFromDottedPath(dottedPath: string): string {
  if (dottedPath === '') return '';
  return `/${parseDottedPathSegments(dottedPath).map(encodeJsonPointerSegment).join('/')}`;
}
