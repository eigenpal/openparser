import { describe, expect, it } from 'bun:test';
import {
  OPENPARSER_CURL_IDEMPOTENCY_KEY_EXPR,
  OPENPARSER_IDEMPOTENCY_KEY_GUIDANCE,
  buildExtractPipelineCurl,
  buildParseCurl,
  serializeOpenParserMultipartRequest,
  shellSingleQuote,
} from './request-examples';

describe('OpenParser request examples', () => {
  it('builds executable multipart parse curl', () => {
    const curl = buildParseCurl({ baseUrl: 'https://api.openparser.dev/' });
    expect(curl).toContain("curl -X POST 'https://api.openparser.dev/parse'");
    expect(curl).toContain("-H 'Authorization: Bearer YOUR_API_KEY'");
    expect(curl).toContain(`-H "Idempotency-Key: ${OPENPARSER_CURL_IDEMPOTENCY_KEY_EXPR}"`);
    expect(curl).not.toContain("-H 'Idempotency-Key: $(");
    expect(curl).toContain(
      `-F 'request={"ocr_model":"paddleocr-vl-1.6","output_format":"openparser@1"};type=application/json'`
    );
    expect(OPENPARSER_IDEMPOTENCY_KEY_GUIDANCE).toContain('unique Idempotency-Key');
  });

  it('uses safe shell quoting and shared JSON serialization for pipeline curl', () => {
    expect(shellSingleQuote("a'b")).toBe(`'a'"'"'b'`);
    expect(serializeOpenParserMultipartRequest({ pipeline_id: "oppl_a'b" })).toBe(
      `request={"pipeline_id":"oppl_a'b"};type=application/json`
    );
    const curl = buildExtractPipelineCurl({
      baseUrl: 'https://api.openparser.dev',
      pipelineId: "oppl_a'b",
    });
    expect(curl).toContain(`-F 'request={"pipeline_id":"oppl_a'"'"'b"};type=application/json'`);
  });
});
