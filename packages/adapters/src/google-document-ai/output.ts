import type { DocumentElementKind, ParsedDocumentWithElementKinds } from '@openparser/schema';

/**
 * Element kinds Google Document AI converters may emit (Enterprise OCR and Layout Parser).
 * Premium/native options and imageless mode change which kinds/assets appear;
 * none are guaranteed on every response.
 */
export const GOOGLE_DOCAI_OCR_OUTPUT_CAPABILITIES = {
  elementKinds: [
    'text',
    'table',
    'formula',
    'selection_mark',
    'other',
  ] as const satisfies readonly DocumentElementKind[],
  geometry: 'optional' as const,
  /** Page image assets when imagelessMode is off and Google returns rasters. */
  assets: 'optional' as const,
  textAnnotations: 'optional' as const,
} as const;

export type GoogleDocAiOcrPossibleElementKind =
  (typeof GOOGLE_DOCAI_OCR_OUTPUT_CAPABILITIES.elementKinds)[number];

export type GoogleDocAiOcrParsedDocument =
  ParsedDocumentWithElementKinds<GoogleDocAiOcrPossibleElementKind>;
