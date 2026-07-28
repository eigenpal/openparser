import { describe, expect, test } from 'bun:test';
import {
  ExtractionPipelineIdInputSchema,
  JobIdInputSchema,
  migratedOcrJobIdFromUuid,
  normalizeOcrPipelineIdInput,
} from './id-compat';
import { JobIdSchema } from './job-id';
import { ExtractionPipelineIdSchema } from './pipelines';

describe('ocr id compatibility (public wire)', () => {
  const uuid = '11111111-1111-4111-8111-111111111111';
  const opj = 'opj_11111111111141118111111111111111';

  test('maps UUID → migrated opj_ deterministically', () => {
    expect(migratedOcrJobIdFromUuid(uuid)).toBe(opj);
    expect(migratedOcrJobIdFromUuid(uuid.toUpperCase())).toBe(opj);
  });

  test('JobIdInputSchema normalizes UUID to opj_ without weakening JobIdSchema', () => {
    expect(JobIdInputSchema.parse(uuid)).toBe(opj);
    expect(JobIdInputSchema.parse(opj)).toBe(opj);
    expect(JobIdInputSchema.parse(`  ${uuid}  `)).toBe(opj);
    expect(JobIdSchema.safeParse(uuid).success).toBe(false);
    expect(JobIdInputSchema.safeParse('not-a-job-id').success).toBe(false);
  });

  test('pipeline input normalizes oep_ → oppl_ without weakening response schema', () => {
    expect(normalizeOcrPipelineIdInput('oep_pipe1')).toBe('oppl_pipe1');
    expect(ExtractionPipelineIdInputSchema.parse('oep_pipe1')).toBe('oppl_pipe1');
    expect(ExtractionPipelineIdSchema.safeParse('oep_pipe1').success).toBe(false);
  });
});
