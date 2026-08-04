import {
  GetDocumentAnalysisCommand,
  GetDocumentTextDetectionCommand,
  StartDocumentAnalysisCommand,
  StartDocumentTextDetectionCommand,
} from '@aws-sdk/client-textract';
import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';

import { AwsTextractError, createAwsTextractClient, textractClientRequestToken } from './index';

const TEST_REGION = 'us-east-2';
const LINE_BLOCKS = [
  {
    Id: 'line-1',
    BlockType: 'LINE',
    Text: 'Invoice total',
    Page: 1,
    Confidence: 99.0,
    Geometry: {
      BoundingBox: { Left: 0.1, Top: 0.1, Width: 0.4, Height: 0.05 },
    },
  },
  {
    Id: 'line-2',
    BlockType: 'LINE',
    Text: '$1,234.56',
    Page: 1,
    Confidence: 98.0,
    Geometry: {
      BoundingBox: { Left: 0.1, Top: 0.2, Width: 0.3, Height: 0.05 },
    },
  },
];

describe('textractClientRequestToken', () => {
  test('uses job id directly when already a valid ClientRequestToken', () => {
    const jobId = 'opj_aaaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa';
    expect(textractClientRequestToken(jobId)).toBe(jobId);
  });

  test('hashes oversized or invalid job ids deterministically', () => {
    const jobId = 'job/with spaces and/slash';
    const expected = createHash('sha256').update(jobId).digest('hex').slice(0, 64);
    expect(textractClientRequestToken(jobId)).toBe(expected);
    expect(textractClientRequestToken(jobId)).toBe(textractClientRequestToken(jobId));
  });
});

describe('createAwsTextractClient', () => {
  test('detect: Start/Get against S3 source with deterministic token and pagination', async () => {
    const commands: unknown[] = [];
    const sleeps: number[] = [];
    let getCalls = 0;

    const client = createAwsTextractClient({
      pollIntervalMs: 1,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      client: {
        async send(command) {
          commands.push(command);
          if (command instanceof StartDocumentTextDetectionCommand) {
            expect(command.input.DocumentLocation?.S3Object).toEqual({
              Bucket: 'eigenpal-ocr',
              Name: 'sources/org/opj_x/source',
            });
            expect(command.input.ClientRequestToken).toBe('opj_bbbbbbbbbbbb4bbb8bbbbbbbbbbbbbbb');
            return { JobId: 'textract-job-1' };
          }
          if (command instanceof GetDocumentTextDetectionCommand) {
            getCalls += 1;
            if (getCalls === 1) {
              return { JobStatus: 'IN_PROGRESS' };
            }
            if (command.input.NextToken) {
              return {
                JobStatus: 'SUCCEEDED',
                DocumentMetadata: { Pages: 1 },
                DetectDocumentTextModelVersion: 'detect-v1',
                Blocks: [LINE_BLOCKS[1]],
              };
            }
            return {
              JobStatus: 'SUCCEEDED',
              DocumentMetadata: { Pages: 1 },
              DetectDocumentTextModelVersion: 'detect-v1',
              Blocks: [LINE_BLOCKS[0]],
              NextToken: 'page-2',
            };
          }
          throw new Error(`unexpected command ${command?.constructor?.name}`);
        },
      },
    });

    const output = await client.parse({
      documentId: 'doc-aws-detect',
      jobId: 'opj_bbbbbbbbbbbb4bbb8bbbbbbbbbbbbbbb',
      source: {
        bucket: 'eigenpal-ocr',
        objectKey: 'sources/org/opj_x/source',
        region: TEST_REGION,
      },
    });

    expect(commands.some((c) => c instanceof StartDocumentTextDetectionCommand)).toBe(true);
    expect(
      commands.filter((c) => c instanceof GetDocumentTextDetectionCommand).length
    ).toBeGreaterThanOrEqual(3);
    expect(sleeps.length).toBe(1);

    expect(output.nativeResult.page_count).toBe(1);
    expect(output.nativeResult.client_request_token).toBe('opj_bbbbbbbbbbbb4bbb8bbbbbbbbbbbbbbb');
    expect(output.nativeResult.blocks).toEqual(LINE_BLOCKS);
    expect(output.canonical.document_id).toBe('doc-aws-detect');
    expect(output.canonical.markdown).toContain('Invoice total');
    expect(output.canonical.markdown).toContain('$1,234.56');
  });

  test('layout: passes feature overrides and queries to StartDocumentAnalysis', async () => {
    let start: StartDocumentAnalysisCommand | null = null;
    const client = createAwsTextractClient({
      pollIntervalMs: 1,
      sleep: async () => {},
      client: {
        async send(command) {
          if (command instanceof StartDocumentAnalysisCommand) {
            start = command;
            return { JobId: 'textract-layout' };
          }
          if (command instanceof GetDocumentAnalysisCommand) {
            return {
              JobStatus: 'SUCCEEDED',
              DocumentMetadata: { Pages: 1 },
              AnalyzeDocumentModelVersion: 'analyze-v1',
              Blocks: LINE_BLOCKS,
            };
          }
          throw new Error('unexpected');
        },
      },
    });

    await client.parse({
      documentId: 'doc-layout',
      jobId: 'opj_cccccccccccc4ccc8ccccccccccccccc',
      featureTypes: ['LAYOUT', 'FORMS', 'SIGNATURES', 'QUERIES'],
      queries: ['What is the customer name?'],
      source: { bucket: 'b', objectKey: 'k' },
    });

    expect(start?.input.FeatureTypes).toEqual(['LAYOUT', 'FORMS', 'SIGNATURES', 'QUERIES']);
    expect(start?.input.QueriesConfig).toEqual({
      Queries: [{ Text: 'What is the customer name?', Pages: ['*'] }],
    });
  });

  test('rejects query text outside Textract printable ASCII', async () => {
    const client = createAwsTextractClient({
      client: {
        async send() {
          throw new Error('should not be called');
        },
      },
    });

    await expect(
      client.parse({
        documentId: 'doc-query-validation',
        jobId: 'opj_11111111111141118111111111111111',
        featureTypes: ['QUERIES'],
        queries: ['Aká je kúpna cena?'],
        source: { bucket: 'b', objectKey: 'k' },
      })
    ).rejects.toThrow('printable-ASCII');
  });

  test('classifies throttling as retryable', async () => {
    const client = createAwsTextractClient({
      client: {
        async send() {
          const error = new Error('Rate exceeded');
          error.name = 'ThrottlingException';
          throw error;
        },
      },
    });

    try {
      await client.parse({
        documentId: 'doc-throttle',
        jobId: 'opj_eeeeeeeeeeee4eee8eeeeeeeeeeeeeee',
        source: { bucket: 'b', objectKey: 'k' },
      });
      throw new Error('expected AwsTextractError');
    } catch (error) {
      expect(error).toBeInstanceOf(AwsTextractError);
      const awsError = error as InstanceType<typeof AwsTextractError>;
      expect(awsError.retryable).toBe(true);
      expect(awsError.providerCode).toBe('ThrottlingException');
    }
  });

  test('accepts caller-selected regions and rejects source/client mismatches', async () => {
    expect(() =>
      createAwsTextractClient({
        region: 'us-west-2',
        client: { async send() {} },
      })
    ).not.toThrow();
    const client = createAwsTextractClient({
      region: TEST_REGION,
      client: {
        async send() {
          throw new Error('should not be called');
        },
      },
    });

    await expect(
      client.parse({
        documentId: 'doc-region',
        jobId: 'opj_ffffffffffffffffffffffffffffffff',
        source: { bucket: 'b', objectKey: 'k', region: 'us-west-2' },
      })
    ).rejects.toMatchObject({
      name: 'AwsTextractError',
      providerCode: 'invalid_source_region',
    });
  });
});
