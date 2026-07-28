import { describe, expect, test } from 'bun:test';
import { JobIdSchema } from './job-id';

describe('JobIdSchema', () => {
  test('accepts opj_ prefixed generateId-shaped values', () => {
    expect(JobIdSchema.parse('opj_V1StGXR8_Z5jdHi6B-myT')).toBe('opj_V1StGXR8_Z5jdHi6B-myT');
    // Migrated UUID form from 0046: opj_ + 32 hex chars
    expect(JobIdSchema.parse('opj_11111111111141118111111111111111')).toBe(
      'opj_11111111111141118111111111111111'
    );
  });

  test('rejects legacy UUIDs and wrong prefixes on the preferred response schema', () => {
    expect(JobIdSchema.safeParse('11111111-1111-4111-8111-111111111111').success).toBe(false);
    expect(JobIdSchema.safeParse('ocrj_V1StGXR8_Z5jdHi6B-myT').success).toBe(false);
    expect(JobIdSchema.safeParse('job_V1StGXR8_Z5jdHi6B-myT').success).toBe(false);
    expect(JobIdSchema.safeParse('oep_V1StGXR8_Z5jdHi6B-myT').success).toBe(false);
    expect(JobIdSchema.safeParse('oppl_V1StGXR8_Z5jdHi6B-myT').success).toBe(false);
  });
});
