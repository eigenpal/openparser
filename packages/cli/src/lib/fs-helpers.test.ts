import { describe, expect, test } from 'bun:test';
import { detectFileMediaType } from './fs-helpers';

describe('detectFileMediaType', () => {
  test('detects supported document signatures', () => {
    expect(detectFileMediaType(new TextEncoder().encode('%PDF-1.7'))).toBe('application/pdf');
    expect(
      detectFileMediaType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ).toBe('image/png');
    expect(detectFileMediaType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
  });

  test('falls back to a generic binary media type', () => {
    expect(detectFileMediaType(new Uint8Array([1, 2, 3]))).toBe('application/octet-stream');
  });
});
