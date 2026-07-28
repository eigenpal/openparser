import { OpenParserTimeoutError } from '../errors';

const requestTimeoutDisposers = new WeakMap<Request, () => void>();

/**
 * Combine multiple abort signals. Uses `AbortSignal.any` when available;
 * otherwise falls back to a controller with explicit listener cleanup.
 */
export function composeAbortSignals(signals: AbortSignal[]): {
  signal: AbortSignal;
  dispose: () => void;
} {
  const active = signals.filter((signal): signal is AbortSignal => signal != null);
  if (active.length === 0) {
    const controller = new AbortController();
    return { signal: controller.signal, dispose: () => {} };
  }
  if (active.length === 1) {
    return { signal: active[0]!, dispose: () => {} };
  }

  if (typeof AbortSignal.any === 'function') {
    return { signal: AbortSignal.any(active), dispose: () => {} };
  }

  const controller = new AbortController();
  const disposers: Array<() => void> = [];

  const abortFrom = (source: AbortSignal) => {
    if (controller.signal.aborted) return;
    controller.abort(source.reason);
    for (const dispose of disposers) dispose();
    disposers.length = 0;
  };

  for (const signal of active) {
    if (signal.aborted) {
      abortFrom(signal);
      break;
    }
    const onAbort = () => abortFrom(signal);
    signal.addEventListener('abort', onAbort, { once: true });
    disposers.push(() => signal.removeEventListener('abort', onAbort));
  }

  return {
    signal: controller.signal,
    dispose: () => {
      for (const dispose of disposers) dispose();
      disposers.length = 0;
    },
  };
}

/** Attach a client timeout without overriding caller cancellation. */
export function withRequestTimeout(
  request: Request,
  timeoutMs: number
): { request: Request; dispose: () => void } {
  const timeoutCtrl = new AbortController();
  const timer = setTimeout(() => timeoutCtrl.abort(new OpenParserTimeoutError()), timeoutMs);
  timer.unref?.();

  const { signal, dispose: disposeCompose } = composeAbortSignals([
    request.signal,
    timeoutCtrl.signal,
  ]);

  let disposed = false;
  const onAbort = () => {
    dispose();
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
    disposeCompose();
    requestTimeoutDisposers.delete(timedRequest);
  };

  signal.addEventListener('abort', onAbort, { once: true });

  const timedRequest = new Request(request, { signal });
  requestTimeoutDisposers.set(timedRequest, dispose);

  return { request: timedRequest, dispose };
}

/** Clear timeout timers/listeners for a timed request after fetch settles. */
export function disposeRequestTimeout(request: Request | undefined): void {
  if (!request) return;
  requestTimeoutDisposers.get(request)?.();
}
