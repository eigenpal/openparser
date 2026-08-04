import type { DocumentElementKind, ParsedDocumentWithElementKinds } from '@openparser/schema';

/**
 * Element kinds the Azure DI converter may emit for Layout analyze results.
 * Read-model responses are a smaller subset (text plus optional add-ons).
 * Feature flags and provider omissions mean none of these are guaranteed.
 */
export const AZURE_DI_LAYOUT_OUTPUT_CAPABILITIES = {
  elementKinds: [
    'text',
    'table',
    'key_value',
    'figure',
    'section',
    'formula',
    'barcode',
    'selection_mark',
  ] as const satisfies readonly DocumentElementKind[],
  geometry: 'optional' as const,
  assets: 'optional' as const,
  textAnnotations: 'optional' as const,
} as const;

/**
 * Read (`prebuilt-read`) emits text, and when add-ons are enabled may also
 * emit `formula` / `barcode` (see Azure model analysis features). Layout-only
 * kinds (tables, key/value, sections, figures, selection marks) stay out.
 */
export const AZURE_DI_READ_OUTPUT_CAPABILITIES = {
  elementKinds: ['text', 'formula', 'barcode'] as const satisfies readonly DocumentElementKind[],
  geometry: 'optional' as const,
  assets: 'none' as const,
  textAnnotations: 'optional' as const,
} as const;

export type AzureDiLayoutPossibleElementKind =
  (typeof AZURE_DI_LAYOUT_OUTPUT_CAPABILITIES.elementKinds)[number];
export type AzureDiReadPossibleElementKind =
  (typeof AZURE_DI_READ_OUTPUT_CAPABILITIES.elementKinds)[number];

export type AzureDiLayoutParsedDocument =
  ParsedDocumentWithElementKinds<AzureDiLayoutPossibleElementKind>;
export type AzureDiReadParsedDocument =
  ParsedDocumentWithElementKinds<AzureDiReadPossibleElementKind>;
