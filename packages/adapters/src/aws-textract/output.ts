import type { DocumentElementKind, ParsedDocumentWithElementKinds } from '@openparser/schema';

/**
 * DetectDocumentText converter output — primarily line/word text elements.
 * Geometry is usually present but still treated as optional for honesty.
 */
export const AWS_TEXTRACT_DETECT_OUTPUT_CAPABILITIES = {
  elementKinds: ['text'] as const satisfies readonly DocumentElementKind[],
  geometry: 'optional' as const,
  assets: 'none' as const,
  textAnnotations: 'none' as const,
} as const;

/**
 * AnalyzeDocument converter output when LAYOUT / TABLES / FORMS / QUERIES / SIGNATURES
 * features may be enabled. Actual kinds depend on FeatureTypes and provider response.
 */
export const AWS_TEXTRACT_ANALYZE_OUTPUT_CAPABILITIES = {
  elementKinds: [
    'text',
    'table',
    'figure',
    'key_value',
    'query_answer',
    'signature',
    'selection_mark',
    'other',
  ] as const satisfies readonly DocumentElementKind[],
  geometry: 'optional' as const,
  assets: 'none' as const,
  textAnnotations: 'none' as const,
} as const;

export type AwsTextractDetectPossibleElementKind =
  (typeof AWS_TEXTRACT_DETECT_OUTPUT_CAPABILITIES.elementKinds)[number];
export type AwsTextractAnalyzePossibleElementKind =
  (typeof AWS_TEXTRACT_ANALYZE_OUTPUT_CAPABILITIES.elementKinds)[number];

export type AwsTextractDetectParsedDocument =
  ParsedDocumentWithElementKinds<AwsTextractDetectPossibleElementKind>;
export type AwsTextractAnalyzeParsedDocument =
  ParsedDocumentWithElementKinds<AwsTextractAnalyzePossibleElementKind>;
