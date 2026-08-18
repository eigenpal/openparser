import { z } from 'zod';
import { AttributesSchema, LineageIdSchema } from './common';

/**
 * Who currently stands behind this entity's value.
 *
 * An assertion names an agent and a time; it does not change the entity.
 * OpenParser extraction review projects this from confirmations rather than
 * storing a separate approve event: an actor counts when their newest live
 * confirmation on this path names the value this entity holds. Confirming a
 * matching value adds standing without minting a new entity; confirming a
 * different value mints a new entity, and standing on the predecessor is left
 * behind. That is why a sign-off never describes a value nobody confirmed.
 *
 * Standing is per entity and does not propagate. Confirming a field says
 * nothing about the region it was read from — that region carries its own
 * standing if someone confirms it.
 */
export const ApprovalAssertionSchema = z
  .object({
    /** Agent in `LineageDocument.agents` that signed off. */
    agent: LineageIdSchema,
    at: z.string().datetime(),
    note: z.string().trim().min(1).max(2_000).optional(),
    attributes: AttributesSchema.optional(),
  })
  .strict();
export type ApprovalAssertion = z.infer<typeof ApprovalAssertionSchema>;
