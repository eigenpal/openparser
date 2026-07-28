import { getDefaultOcrModelId } from './ocr-models';
import type { OcrOutputFormat } from './raw-result';

export const OPENPARSER_DEFAULT_OUTPUT_FORMAT = 'openparser@1' as const satisfies OcrOutputFormat;
export const OPENPARSER_CURL_API_KEY_PLACEHOLDER = 'YOUR_API_KEY';
export const OPENPARSER_CURL_IDEMPOTENCY_KEY_EXPR =
  '$(uuidgen 2>/dev/null || openssl rand -hex 16)';
export const OPENPARSER_IDEMPOTENCY_KEY_GUIDANCE =
  'Use a unique Idempotency-Key for each distinct request body. Reuse the same key only when retrying an identical admission.';

export type OpenParserMultipartAdmissionPath =
  | '/parse'
  | '/parse/async'
  | '/parse/batch'
  | '/extract'
  | '/extract/async'
  | '/extract/batch';

export type CanonicalParseRequestExample = {
  ocr_model: string;
  output_format: typeof OPENPARSER_DEFAULT_OUTPUT_FORMAT;
};

/** Minimal valid parse request shared by generated docs and UI snippets. */
export function canonicalParseRequestExample(): CanonicalParseRequestExample {
  return {
    ocr_model: getDefaultOcrModelId(),
    output_format: OPENPARSER_DEFAULT_OUTPUT_FORMAT,
  };
}

/** POSIX-shell single quoting, including embedded apostrophes. */
export function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

export function serializeOpenParserMultipartRequest(body: Record<string, unknown>): string {
  return `request=${JSON.stringify(body)};type=application/json`;
}

export function buildOpenParserMultipartCurl(input: {
  baseUrl: string;
  path: OpenParserMultipartAdmissionPath;
  requestBody: Record<string, unknown>;
  filePath?: string;
}): string {
  const baseUrl = input.baseUrl.replace(/\/$/, '');
  const filePath = input.filePath ?? './document.pdf';
  return [
    `curl -X POST ${shellSingleQuote(`${baseUrl}${input.path}`)} \\`,
    `  -H ${shellSingleQuote(`Authorization: Bearer ${OPENPARSER_CURL_API_KEY_PLACEHOLDER}`)} \\`,
    `  -H "Idempotency-Key: ${OPENPARSER_CURL_IDEMPOTENCY_KEY_EXPR}" \\`,
    `  -F ${shellSingleQuote(serializeOpenParserMultipartRequest(input.requestBody))} \\`,
    `  -F ${shellSingleQuote(`file=@${filePath}`)}`,
  ].join('\n');
}

export function buildParseCurl(input: {
  baseUrl: string;
  path?: '/parse' | '/parse/async';
  filePath?: string;
}): string {
  return buildOpenParserMultipartCurl({
    baseUrl: input.baseUrl,
    path: input.path ?? '/parse',
    requestBody: canonicalParseRequestExample(),
    filePath: input.filePath,
  });
}

export function buildExtractPipelineCurl(input: {
  baseUrl: string;
  pipelineId: string;
  filePath?: string;
}): string {
  return buildOpenParserMultipartCurl({
    baseUrl: input.baseUrl,
    path: '/extract/async',
    requestBody: { pipeline_id: input.pipelineId },
    filePath: input.filePath,
  });
}
