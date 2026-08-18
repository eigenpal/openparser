import { z } from 'zod';
import { AttributesSchema, LineageIdSchema } from './common';

/**
 * Explicit numeric scale for a confidence score.
 *
 * Scores are not forced into 0..1 so original provider scales remain
 * representable without lossy normalization.
 */
export const ConfidenceScaleSchema = z
  .object({
    min: z.number().finite(),
    max: z.number().finite(),
  })
  .strict()
  .superRefine((scale, ctx) => {
    if (!(scale.max > scale.min)) {
      ctx.addIssue({
        code: 'custom',
        message: 'confidence scale max must be greater than min',
        path: ['max'],
      });
    }
  });
export type ConfidenceScale = z.infer<typeof ConfidenceScaleSchema>;

export const CONFIDENCE_KINDS = ['reported', 'derived', 'assessed'] as const;
export const ConfidenceKindSchema = z.enum(CONFIDENCE_KINDS);
export type ConfidenceKind = z.infer<typeof ConfidenceKindSchema>;

export const ConfidenceSourceSchema = z
  .object({
    type: z.enum(['entity', 'activity', 'agent']),
    id: LineageIdSchema,
  })
  .strict();
export type ConfidenceSource = z.infer<typeof ConfidenceSourceSchema>;

/**
 * Generic confidence assertion attached to entities, derivations, or other
 * statements. `score` must lie within `scale`; comparison across uncalibrated
 * assertions is not implied.
 */
export const ConfidenceAssertionSchema = z
  .object({
    score: z.number().finite(),
    scale: ConfidenceScaleSchema,
    kind: ConfidenceKindSchema,
    /** What the score measures (e.g. recognition, classification, quality). */
    scope: z.string().trim().min(1).max(128),
    /** Optional finer grain within scope (e.g. field, page, token). */
    granularity: z.string().trim().min(1).max(128).optional(),
    /** When false, scores must not be treated as calibrated probabilities. */
    calibrated: z.boolean().default(false),
    /** Entities, activities, or agents that substantiate or produced this assertion. */
    sources: z.array(ConfidenceSourceSchema).max(256).optional(),
    method: z.string().trim().min(1).max(256).optional(),
    sampleCount: z.number().int().positive().optional(),
    attributes: AttributesSchema.optional(),
  })
  .strict()
  .superRefine((assertion, ctx) => {
    const { score, scale } = assertion;
    if (score < scale.min || score > scale.max) {
      ctx.addIssue({
        code: 'custom',
        message: `confidence score ${score} is outside scale [${scale.min}, ${scale.max}]`,
        path: ['score'],
      });
    }
  });
export type ConfidenceAssertion = z.infer<typeof ConfidenceAssertionSchema>;
