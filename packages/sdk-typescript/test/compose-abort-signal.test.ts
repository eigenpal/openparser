import { describe, expect, test } from 'bun:test';
import { composeAbortSignals, withRequestTimeout } from '../src/lib/compose-abort-signal';

describe('composeAbortSignals', () => {
  test('dispose removes listeners without aborting when AbortSignal.any is unavailable', () => {
    const any = AbortSignal.any;
    // @ts-expect-error test-only fallback path
    AbortSignal.any = undefined;
    try {
      const a = new AbortController();
      const b = new AbortController();
      const { signal, dispose } = composeAbortSignals([a.signal, b.signal]);

      dispose();
      a.abort(new Error('late'));
      expect(signal.aborted).toBe(false);
    } finally {
      // @ts-expect-error restore native implementation
      AbortSignal.any = any;
    }
  });

  test('dispose clears timeout without aborting the composed signal', async () => {
    const timeoutMs = 80;
    const source = new Request('https://api.openparser.dev/models/ocr');
    const { request, dispose } = withRequestTimeout(source, timeoutMs);

    dispose();
    await new Promise((resolve) => setTimeout(resolve, timeoutMs + 30));
    expect(request.signal.aborted).toBe(false);
  });
});
