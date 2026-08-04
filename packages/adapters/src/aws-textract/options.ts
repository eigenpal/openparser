import { z } from 'zod';
import { AwsTextractError } from './errors';

export const AWS_TEXTRACT_FEATURE_TYPES = [
  'TABLES',
  'FORMS',
  'QUERIES',
  'SIGNATURES',
  'LAYOUT',
] as const;

export type AwsTextractFeatureTypeName = (typeof AWS_TEXTRACT_FEATURE_TYPES)[number];

export const AwsTextractFeatureTypeSchema = z.enum(AWS_TEXTRACT_FEATURE_TYPES);

/**
 * Analyze-time option knobs commonly layered on top of base FeatureTypes.
 * DetectDocumentText has no FeatureTypes; enabling these implies Analyze.
 */
export const AwsTextractAnalyzeOptionsSchema = z
  .object({
    forms: z.boolean().optional(),
    signatures: z.boolean().optional(),
    queries: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(200)
          .regex(/^[\x20-\x7e]+$/, 'AWS Textract queries support printable ASCII text only')
      )
      .max(30)
      .nullable()
      .optional(),
  })
  .strict();

export type AwsTextractAnalyzeOptions = z.infer<typeof AwsTextractAnalyzeOptionsSchema>;

export function parseAwsTextractAnalyzeOptions(options: unknown): AwsTextractAnalyzeOptions {
  const parsed = AwsTextractAnalyzeOptionsSchema.safeParse(options ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new AwsTextractError(
      issue
        ? `AWS Textract option invalid: ${issue.path.join('.') || '(root)'} ${issue.message}`
        : 'AWS Textract options are invalid'
    );
  }
  return parsed.data;
}

/**
 * Merge base FeatureTypes with analyze options.
 * Real provider facts:
 * - Omit / empty featureTypes → DetectDocumentText (no FeatureTypes).
 * - Non-empty featureTypes → StartDocumentAnalysis.
 * - `forms` / `signatures` / non-empty `queries` add FORMS / SIGNATURES / QUERIES.
 * - Queries require the QUERIES feature type on Analyze.
 */
export function resolveAwsTextractFeatureTypes(input: {
  baseFeatureTypes?: readonly AwsTextractFeatureTypeName[] | null;
  options?: AwsTextractAnalyzeOptions;
}): AwsTextractFeatureTypeName[] | undefined {
  const options = input.options ? parseAwsTextractAnalyzeOptions(input.options) : {};
  const featureTypes = new Set<AwsTextractFeatureTypeName>(input.baseFeatureTypes ?? []);
  if (options.forms === true) featureTypes.add('FORMS');
  if (options.signatures === true) featureTypes.add('SIGNATURES');
  const queries = Array.isArray(options.queries) ? options.queries : [];
  if (queries.length > 0) featureTypes.add('QUERIES');
  if (featureTypes.size === 0) return undefined;
  return [...featureTypes];
}

export function assertAwsTextractAnalyzeCompatibility(input: {
  featureTypes?: readonly AwsTextractFeatureTypeName[];
  queries?: readonly string[];
}): void {
  const featureTypes = input.featureTypes;
  if (featureTypes !== undefined && featureTypes.length === 0) {
    throw new AwsTextractError('AWS Textract featureTypes must be a non-empty array');
  }
  const queries = input.queries ?? [];
  if (queries.length > 0) {
    if (!featureTypes || !featureTypes.includes('QUERIES')) {
      throw new AwsTextractError(
        'AWS Textract queries require the QUERIES feature type (StartDocumentAnalysis)'
      );
    }
  }
}
