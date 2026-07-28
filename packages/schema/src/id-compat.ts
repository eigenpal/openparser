import { z } from 'zod';
import { JobIdSchema, OCR_JOB_ID_PATTERN } from './job-id';
import { ExtractionPipelineIdSchema } from './pipelines';

/**
 * Public request-side id expand helpers for OpenParser (`opj_` / `oppl_`).
 *
 * Preferred wire format is `opj_` / `oppl_`. During the expand window, request
 * paths and body fields also accept remapped legacy forms and normalize them to
 * the preferred prefix. Response / OpenAPI schemas stay strict preferred-only.
 *
 * Persistence-layer lookup policy and reverse remaps are intentionally outside
 * this public wire-contract package.
 */

/** Pre-cutover public job ids were UUID strings. */
export const LEGACY_OCR_JOB_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Deterministic cutover mapping: `opj_` + lowercase hex (no dashes). */
export function migratedOcrJobIdFromUuid(uuid: string): string {
  return `opj_${uuid.toLowerCase().replace(/-/g, '')}`;
}

/** Normalize a request job id: UUID → `opj_<hex>`; otherwise leave unchanged. */
export function normalizeOcrJobIdInput(id: string): string {
  const trimmed = id.trim();
  if (LEGACY_OCR_JOB_UUID_PATTERN.test(trimmed)) {
    return migratedOcrJobIdFromUuid(trimmed);
  }
  return trimmed;
}

/**
 * Request-side job id: accepts legacy UUID, outputs preferred `opj_`.
 * Use string+transform (not preprocess) so OpenAPI `io: input` keeps
 * `required` and a plain string property; preferred pattern stays on
 * {@link JobIdSchema} response components.
 */
export const JobIdInputSchema = z
  .string()
  .max(128)
  .transform((value, ctx) => {
    const normalized = normalizeOcrJobIdInput(value);
    if (!OCR_JOB_ID_PATTERN.test(normalized)) {
      ctx.addIssue({
        code: 'custom',
        message: 'job id must be an opj_… id',
      });
      return z.NEVER;
    }
    return normalized as z.infer<typeof JobIdSchema>;
  });
export type JobIdInput = z.infer<typeof JobIdSchema>;

export function isOcrJobIdInput(id: string): boolean {
  return JobIdInputSchema.safeParse(id).success;
}

export function isPreferredOcrJobId(id: string): boolean {
  return OCR_JOB_ID_PATTERN.test(id);
}

/** Pre-cutover saved pipeline ids used `oep_`. */
export const LEGACY_OCR_PIPELINE_ID_PREFIX = 'oep_' as const;

/** Normalize a request pipeline id: `oep_<suffix>` → `oppl_<suffix>`. */
export function normalizeOcrPipelineIdInput(id: string): string {
  const trimmed = id.trim();
  if (trimmed.startsWith(LEGACY_OCR_PIPELINE_ID_PREFIX)) {
    return `oppl_${trimmed.slice(LEGACY_OCR_PIPELINE_ID_PREFIX.length)}`;
  }
  return trimmed;
}

/** Request-side pipeline id: accepts legacy `oep_`, outputs preferred `oppl_`. */
export const ExtractionPipelineIdInputSchema = z
  .string()
  .max(128)
  .transform((value, ctx) => {
    const normalized = normalizeOcrPipelineIdInput(value);
    const parsed = ExtractionPipelineIdSchema.safeParse(normalized);
    if (!parsed.success) {
      ctx.addIssue({
        code: 'custom',
        message: 'pipeline_id must be an oppl_… id',
      });
      return z.NEVER;
    }
    return parsed.data;
  });
export type ExtractionPipelineIdInput = z.infer<typeof ExtractionPipelineIdSchema>;
