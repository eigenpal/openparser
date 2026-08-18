import { z } from 'zod';
import { ActivitySchema, AgentSchema } from './activity';
import { AttributesSchema, LineageFormatSchema, LineageIdSchema } from './common';
import { DerivationSchema } from './derivation';
import { EntitySchema } from './entity';
import { RelationSchema } from './relation';
import { LineageValidationError, validateLineageGraph } from './validate';

/**
 * Structural Zod schema for a `lineage@1` document (shape only).
 * Use {@link LineageDocumentSchema} or {@link parseLineageDocument} for
 * shape + strict graph validation.
 */
export const LineageDocumentShapeSchema = z
  .object({
    format: LineageFormatSchema,
    id: LineageIdSchema.optional(),
    /** Profile URIs or short names declaring extension semantics. */
    profiles: z.array(z.string().trim().min(1).max(1024)).max(64).optional(),
    entities: z.record(LineageIdSchema, EntitySchema).default({}),
    activities: z.record(LineageIdSchema, ActivitySchema).default({}),
    agents: z.record(LineageIdSchema, AgentSchema).default({}),
    derivations: z.array(DerivationSchema).max(100_000).default([]),
    relations: z.array(RelationSchema).max(100_000).default([]),
    /** Entity ids that are primary outputs of this document. */
    outputs: z.array(LineageIdSchema).max(10_000).default([]),
    attributes: AttributesSchema.optional(),
  })
  .strict();

export type LineageDocument = z.infer<typeof LineageDocumentShapeSchema>;

/**
 * Parse and strictly validate a lineage document (shape + graph invariants).
 */
export function parseLineageDocument(input: unknown): LineageDocument {
  const doc = LineageDocumentShapeSchema.parse(input);
  validateLineageGraph(doc);
  return doc;
}

/**
 * Safe parse with Zod issues and/or graph validation errors.
 */
export function safeParseLineageDocument(
  input: unknown
):
  | { success: true; data: LineageDocument }
  | { success: false; error: z.ZodError | LineageValidationError } {
  const shape = LineageDocumentShapeSchema.safeParse(input);
  if (!shape.success) {
    return { success: false, error: shape.error };
  }
  try {
    validateLineageGraph(shape.data);
    return { success: true, data: shape.data };
  } catch (error) {
    if (error instanceof LineageValidationError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Zod schema that applies graph validation via `superRefine`. Prefer
 * {@link parseLineageDocument} when you want thrown `LineageValidationError`
 * with structured issue lists.
 */
export const LineageDocumentSchema = LineageDocumentShapeSchema.superRefine((doc, ctx) => {
  try {
    validateLineageGraph(doc);
  } catch (error) {
    if (error instanceof LineageValidationError) {
      for (const message of error.issues) {
        ctx.addIssue({ code: 'custom', message });
      }
      return;
    }
    throw error;
  }
});
