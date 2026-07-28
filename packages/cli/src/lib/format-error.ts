import { OpenParserError } from '@openparser/sdk';
import { resolveConfig } from './config';
import { error, ui } from './ui';

const CONNECTION_FAILURE_TOKENS = [
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ERR_INVALID_URL',
  'fetch failed',
  'Unable to connect',
];

function isConnectionFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  let cursor: unknown = err;
  for (let i = 0; i < 4 && cursor instanceof Error; i++) {
    const m = String(cursor.message ?? '');
    const code = (cursor as { code?: unknown }).code;
    if (CONNECTION_FAILURE_TOKENS.some((t) => m.includes(t))) return true;
    if (typeof code === 'string' && CONNECTION_FAILURE_TOKENS.includes(code)) return true;
    cursor = (cursor as { cause?: unknown }).cause;
  }
  return false;
}

export function formatCliError(err: unknown, context?: { baseUrl?: string }): string {
  if (err instanceof OpenParserError) {
    if (err.status === 401) {
      return `${err.message}\n  Run \`openparser auth login\` or set OPENPARSER_API_KEY.`;
    }
    const requestId = err.requestId ? `\n  request id: ${err.requestId}` : '';
    return `${err.message}${requestId}`;
  }
  if (isConnectionFailure(err)) {
    const url = context?.baseUrl;
    const suffix = url ? ` at ${url}` : '';
    return `Could not connect to the OpenParser API${suffix}\n  Set OPENPARSER_BASE_URL or pass --base-url <url>.`;
  }
  return err instanceof Error ? err.message : String(err);
}

export function printApiError(err: unknown, context?: { baseUrl?: string }): void {
  if (err instanceof OpenParserError && err.envelope?.error) {
    const body = err.envelope.error;
    error(body.message);
    if (body.request_id) {
      process.stderr.write(`${ui.dim('request id:')} ${body.request_id}\n`);
    }
    if (body.code) {
      process.stderr.write(`${ui.dim('code:')} ${body.code}\n`);
    }
    return;
  }
  error(formatCliError(err, context));
}

export function action<A extends unknown[]>(
  body: (...args: A) => Promise<void>
): (...args: A) => Promise<void> {
  return async (...args: A) => {
    try {
      await body(...args);
    } catch (err) {
      printApiError(err, { baseUrl: resolveBaseUrlFromActionArgs(args) });
      process.exit(1);
    }
  };
}

function resolveBaseUrlFromActionArgs(args: readonly unknown[]): string | undefined {
  const cmd = args[args.length - 1] as { opts?: () => unknown } | undefined;
  if (!cmd || typeof cmd.opts !== 'function') return undefined;
  try {
    return resolveConfig(cmd.opts() as { baseUrl?: string }).baseUrl;
  } catch {
    return undefined;
  }
}
