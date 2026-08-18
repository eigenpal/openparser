import { z } from 'zod';
import { ApprovalAssertionSchema } from './approval';
import { AttributesSchema, JsonPointerSchema, JsonValueSchema, LineageIdSchema } from './common';
import { ConfidenceAssertionSchema } from './confidence';

/** How an agent relates to an entity (PROV wasAttributedTo). */
export const AttributionSchema = z
  .object({
    agent: LineageIdSchema,
    role: z.string().trim().min(1).max(128).optional(),
    attributes: AttributesSchema.optional(),
  })
  .strict();
export type Attribution = z.infer<typeof AttributionSchema>;

/**
 * Content-addressing digest for artifacts or values when a cryptographic
 * fingerprint is available.
 */
export const DigestSchema = z
  .object({
    algorithm: z.string().trim().min(1).max(64),
    value: z.string().trim().min(1).max(512),
  })
  .strict();
export type Digest = z.infer<typeof DigestSchema>;

/**
 * External location of an artifact (URI, media type, optional integrity).
 */
export const LocatorSchema = z
  .object({
    uri: z.string().trim().min(1).max(4096),
    mediaType: z.string().trim().min(1).max(256).optional(),
    digest: DigestSchema.optional(),
    attributes: AttributesSchema.optional(),
  })
  .strict();
export type Locator = z.infer<typeof LocatorSchema>;

/**
 * Sub-resource selector within a located artifact (JSON Pointer, XPath,
 * page/region, byte range, etc.). `type` is open for profiles.
 */
export const SelectorSchema = z
  .object({
    type: z.string().trim().min(1).max(128),
    value: JsonValueSchema,
    attributes: AttributesSchema.optional(),
  })
  .strict();
export type Selector = z.infer<typeof SelectorSchema>;

export const ENTITY_KINDS = ['value', 'artifact', 'evidence', 'decision', 'collection'] as const;
export const EntityKindSchema = z.enum(ENTITY_KINDS);
export type EntityKind = z.infer<typeof EntityKindSchema>;

/**
 * A node in the derivation DAG: data value, file/blob, supporting evidence,
 * a decision outcome, or a collection of other entities.
 *
 * Map keys in `LineageDocument.entities` are the authoritative entity ids.
 */
export const EntitySchema = z
  .object({
    kind: EntityKindSchema,
    name: z.string().trim().min(1).max(512).optional(),
    /** Inline JSON value when the entity is a materialized datum. */
    value: JsonValueSchema.optional(),
    /** Unambiguous location within a larger JSON value (RFC 6901). */
    path: JsonPointerSchema.optional(),
    /** Optional JSON Schema (or profile schema object) describing `value`. */
    schema: z.record(z.string(), JsonValueSchema).optional(),
    locator: LocatorSchema.optional(),
    selector: SelectorSchema.optional(),
    digest: DigestSchema.optional(),
    confidence: z.array(ConfidenceAssertionSchema).max(64).optional(),
    /**
     * Who stands behind this value. Standing is per entity and does not
     * propagate. OpenParser extraction review projects this from confirmations.
     */
    approvals: z.array(ApprovalAssertionSchema).max(64).optional(),
    attributions: z.array(AttributionSchema).max(64).optional(),
    attributes: AttributesSchema.optional(),
  })
  .strict();
export type Entity = z.infer<typeof EntitySchema>;
