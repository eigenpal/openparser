import { z } from 'zod';
import { AttributesSchema, LineageIdSchema } from './common';

export const RELATION_TYPES = ['member_of', 'specialization_of', 'alternate_of'] as const;
export const RelationTypeSchema = z.enum(RELATION_TYPES);
export type RelationType = z.infer<typeof RelationTypeSchema>;

/**
 * Semantic entity–entity relations outside the derivation DAG.
 *
 * - `member_of`: `source` is a member; `target` must be a `collection` entity
 * - `specialization_of`: `source` specializes `target` (PROV specializationOf)
 * - `alternate_of`: `source` and `target` are alternate of each other
 */
export const RelationSchema = z
  .object({
    type: RelationTypeSchema,
    source: LineageIdSchema,
    target: LineageIdSchema,
    attributes: AttributesSchema.optional(),
  })
  .strict()
  .superRefine((relation, ctx) => {
    if (relation.source === relation.target) {
      ctx.addIssue({
        code: 'custom',
        message: 'relation source and target must be distinct',
        path: ['target'],
      });
    }
  });
export type Relation = z.infer<typeof RelationSchema>;
