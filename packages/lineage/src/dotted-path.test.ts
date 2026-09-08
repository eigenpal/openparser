import { describe, expect, it } from 'bun:test';

import {
  decodeDottedPathSegment,
  dottedPathFromPointer,
  encodeDottedPathSegment,
  parseDottedPathSegments,
  pointerFromDottedPath,
} from './dotted-path';

describe('dotted path segment encoding', () => {
  it('leaves ordinary keys unchanged', () => {
    expect(encodeDottedPathSegment('vendor')).toBe('vendor');
    expect(encodeDottedPathSegment('0')).toBe('0');
    expect(encodeDottedPathSegment('items/0')).toBe('items/0');
  });

  it('escapes dots and tildes without colliding on literal ~2', () => {
    expect(encodeDottedPathSegment('vendor.name')).toBe('vendor~2name');
    expect(decodeDottedPathSegment('vendor~2name')).toBe('vendor.name');
    expect(encodeDottedPathSegment('~2')).toBe('~02');
    expect(decodeDottedPathSegment('~02')).toBe('~2');
    expect(encodeDottedPathSegment('a~2b')).toBe('a~02b');
    expect(decodeDottedPathSegment('a~02b')).toBe('a~2b');
    expect(encodeDottedPathSegment('~amount')).toBe('~0amount');
    expect(decodeDottedPathSegment('~0amount')).toBe('~amount');
  });

  it('rejects invalid escape sequences', () => {
    expect(() => decodeDottedPathSegment('bad~1key')).toThrow(/Invalid dotted path escape/);
  });
});

describe('json pointer ↔ dotted path roundtrip', () => {
  const pointers = [
    '/vendor',
    '/total',
    '/items/0/amount',
    '/items/1/amount',
    '/vendor.name',
    '/~02',
    '/a~0b.c',
    '/line~1items/0/total',
    '/0/total',
    '/weird/key.with~0tilde.and.dot',
  ];

  for (const pointer of pointers) {
    it(`round-trips ${pointer}`, () => {
      const dotted = dottedPathFromPointer(pointer);
      expect(pointerFromDottedPath(dotted)).toBe(pointer);
      expect(dottedPathFromPointer(pointerFromDottedPath(dotted))).toBe(dotted);
    });
  }

  it('preserves ordinary nested paths', () => {
    expect(dottedPathFromPointer('/items/1/amount')).toBe('items.1.amount');
    expect(pointerFromDottedPath('items.1.amount')).toBe('/items/1/amount');
  });

  it('distinguishes dotted keys from nesting', () => {
    expect(dottedPathFromPointer('/vendor.name')).toBe('vendor~2name');
    expect(pointerFromDottedPath('vendor.name')).toBe('/vendor/name');
    expect(pointerFromDottedPath('vendor~2name')).toBe('/vendor.name');
  });

  it('parses dotted paths into decoded segments', () => {
    expect(parseDottedPathSegments('items.1.~0amount')).toEqual(['items', '1', '~amount']);
    expect(parseDottedPathSegments('vendor~2name')).toEqual(['vendor.name']);
  });
});
