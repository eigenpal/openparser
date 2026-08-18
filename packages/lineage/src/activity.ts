import { z } from 'zod';
import { AttributesSchema, JsonValueSchema, LineageIdSchema, TimestampSchema } from './common';

/** How an agent relates to an activity (PROV wasAssociatedWith). */
export const AssociationSchema = z
  .object({
    agent: LineageIdSchema,
    role: z.string().trim().min(1).max(128).optional(),
    attributes: AttributesSchema.optional(),
  })
  .strict();
export type Association = z.infer<typeof AssociationSchema>;

export const ACTIVITY_STATUSES = ['scheduled', 'started', 'ended', 'failed', 'cancelled'] as const;
export const ActivityStatusSchema = z.enum(ACTIVITY_STATUSES);
export type ActivityStatus = z.infer<typeof ActivityStatusSchema>;

/**
 * Optional description of the concrete implementation that performed an
 * activity (library, model, service, script, binary, …).
 */
export const ImplementationSchema = z
  .object({
    type: z.string().trim().min(1).max(128).optional(),
    name: z.string().trim().min(1).max(512).optional(),
    version: z.string().trim().min(1).max(128).optional(),
    uri: z.string().trim().min(1).max(4096).optional(),
    attributes: AttributesSchema.optional(),
  })
  .strict();
export type Implementation = z.infer<typeof ImplementationSchema>;

/**
 * A process that used and/or generated entities. `type` is an open string so
 * profiles can introduce domain-specific activity types without a format bump.
 *
 * Map keys in `LineageDocument.activities` are the authoritative activity ids.
 */
export const ActivitySchema = z
  .object({
    type: z.string().trim().min(1).max(256),
    name: z.string().trim().min(1).max(512).optional(),
    status: ActivityStatusSchema.optional(),
    startedAt: TimestampSchema.optional(),
    endedAt: TimestampSchema.optional(),
    implementation: ImplementationSchema.optional(),
    parameters: z.record(z.string().min(1), JsonValueSchema).optional(),
    associations: z.array(AssociationSchema).max(64).optional(),
    attributes: AttributesSchema.optional(),
  })
  .strict();
export type Activity = z.infer<typeof ActivitySchema>;

/**
 * An agent (person, organization, software, service) that acts or is
 * attributed. Map keys in `LineageDocument.agents` are the authoritative ids.
 */
export const AgentSchema = z
  .object({
    type: z.string().trim().min(1).max(128).optional(),
    name: z.string().trim().min(1).max(512).optional(),
    attributes: AttributesSchema.optional(),
  })
  .strict();
export type Agent = z.infer<typeof AgentSchema>;
