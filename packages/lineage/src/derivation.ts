import { z } from 'zod';
import { AttributesSchema, LineageIdSchema } from './common';
import { ConfidenceAssertionSchema } from './confidence';

export const DERIVATION_EFFECTS = ['direct', 'indirect'] as const;
export const MAX_DERIVATION_INPUTS = 1_024;
export const DerivationEffectSchema = z.enum(DERIVATION_EFFECTS);
export type DerivationEffect = z.infer<typeof DerivationEffectSchema>;

/**
 * An input entity reference on a derivation, with optional role and whether
 * the influence on the output is direct or indirect (PROV: Revision /
 * Quotation / PrimarySource style distinctions are profile-level; here we
 * keep the general direct/indirect effect flag).
 *
 * `confidence` measures this input's contribution to this one output, which is
 * not the same statement as the input entity's own confidence. A shared source
 * region is read once but cited by several outputs, and each output may draw on
 * a different, differently legible part of it — so how well one output was
 * recognized in that region belongs on the edge, not on the region.
 */
export const DerivationInputSchema = z
  .object({
    entity: LineageIdSchema,
    role: z.string().trim().min(1).max(128).optional(),
    effect: DerivationEffectSchema.default('direct'),
    confidence: ConfidenceAssertionSchema.optional(),
    attributes: AttributesSchema.optional(),
  })
  .strict();
export type DerivationInput = z.infer<typeof DerivationInputSchema>;

/**
 * Optional descriptor of how inputs were transformed into the output.
 *
 * `type` is an open string. OpenLineage's column-lineage vocabulary —
 * `identity`, `transformation`, `aggregation`, `join`, `group_by`, `filter`,
 * `sort`, `window`, `conditional` — reads well here, and profiles may use their
 * own namespaced values instead.
 */
export const TransformationSchema = z
  .object({
    type: z.string().trim().min(1).max(128).optional(),
    description: z.string().trim().min(1).max(4096).optional(),
    expression: z.string().trim().min(1).max(8192).optional(),
    masking: z.boolean().optional(),
    attributes: AttributesSchema.optional(),
  })
  .strict();
export type Transformation = z.infer<typeof TransformationSchema>;

/**
 * Output-centric derivation: one activity produced exactly one output entity
 * from zero or more typed inputs. A derived entity has at most one producer
 * derivation in a document (enforced by graph validation).
 *
 * `output` already identifies the derivation uniquely, so `id` is optional and
 * normally omitted — use {@link derivationId} to resolve one. Producers with
 * their own stable identifiers may still set it.
 */
export const DerivationSchema = z
  .object({
    id: LineageIdSchema.optional(),
    output: LineageIdSchema,
    activity: LineageIdSchema,
    inputs: z.array(DerivationInputSchema).max(MAX_DERIVATION_INPUTS).default([]),
    transformation: TransformationSchema.optional(),
    confidence: ConfidenceAssertionSchema.optional(),
    attributes: AttributesSchema.optional(),
  })
  .strict();
export type Derivation = z.infer<typeof DerivationSchema>;

/**
 * Stable identifier for a derivation: its explicit `id` when the producer set
 * one, otherwise `derivation:<output>`. Because one derivation produces one
 * output, that fallback is unique within a document.
 */
export function derivationId(derivation: Pick<Derivation, 'id' | 'output'>): string {
  return derivation.id ?? `derivation:${derivation.output}`;
}
