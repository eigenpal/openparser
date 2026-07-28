import { z } from 'zod';

/**
 * Public OpenParser OCR job IDs use `opj_` (OpenParser Job), parallel to public
 * pipeline ids (`oppl_`). Internal OCR rows use `opi` / `opa` / `opc`.
 * Do not reuse workflow-queue `job_` ids.
 *
 * Response / OpenAPI shapes stay `opj_`-only. Request ingress may accept legacy
 * UUID forms via {@link JobIdInputSchema} / `normalizeOcrJobIdInput` during the
 * 0046 expand window — see `id-compat.ts`.
 */
export const OCR_JOB_ID_PREFIX = 'opj' as const;
export const OCR_JOB_ID_PATTERN = /^opj_[A-Za-z0-9_-]+$/;

export const JobIdSchema = z
  .string()
  .regex(OCR_JOB_ID_PATTERN, 'job id must be an opj_… id')
  .max(128);
export type JobId = z.infer<typeof JobIdSchema>;
