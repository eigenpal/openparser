import { describe, expect, it } from 'bun:test';
import { buildExtractRequest } from '../commands/extract';
import { buildParseRequest } from '../commands/parse';

describe('buildParseRequest', () => {
  it('includes file_id when provided', () => {
    expect(buildParseRequest({ fileId: 'file_abc', ocrModel: 'paddleocr-vl-1.6' })).toEqual({
      ocr_model: 'paddleocr-vl-1.6',
      output_format: 'openparser@1',
      file_id: 'file_abc',
    });
  });
});

describe('buildExtractRequest', () => {
  it('builds pipeline-only config without inline fields', () => {
    expect(
      buildExtractRequest({
        pipelineId: 'oppl_1',
        fileId: 'file_1',
      })
    ).toEqual({
      pipeline_id: 'oppl_1',
      file_id: 'file_1',
    });
  });

  it('omits ocr_model when reusing a parse job', () => {
    const request = buildExtractRequest({
      parseJobId: 'opj_1',
      schemaJson: '{"type":"object"}',
      llmModel: 'openai/gpt-4.1-mini',
      grounding: 'field',
      repairAttempts: 1,
      outputFormat: 'openparser@1',
    });
    expect(request).toEqual({
      llm_model: 'openai/gpt-4.1-mini',
      schema: { type: 'object' },
      parse_job_id: 'opj_1',
      grounding: 'field',
      repair_attempts: 1,
      output_format: 'openparser@1',
    });
    expect(request).not.toHaveProperty('ocr_model');
  });

  it('includes ocr_model for file-backed inline extract', () => {
    expect(
      buildExtractRequest({
        fileId: 'file_1',
        schemaJson: '{"type":"object","properties":{}}',
      })
    ).toEqual({
      ocr_model: 'paddleocr-vl-1.6',
      llm_model: 'openai/gpt-4.1-mini',
      schema: { type: 'object', properties: {} },
      file_id: 'file_1',
    });
  });
});
