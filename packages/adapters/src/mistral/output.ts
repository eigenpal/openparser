import type { DocumentElementKind, ParsedDocumentWithElementKinds } from '@openparser/schema';

/**
 * Element kinds the Mistral OCR converter may emit.
 * Geometry/assets/annotations depend on model response and options (e.g. `include_blocks`);
 * none of these fields are guaranteed on every document.
 */
export const MISTRAL_OCR_OUTPUT_CAPABILITIES = {
  elementKinds: [
    'text',
    'table',
    'figure',
    'signature',
    'link',
  ] as const satisfies readonly DocumentElementKind[],
  /** Bounding boxes appear when the provider returns block/image geometry. */
  geometry: 'optional' as const,
  /** Embedded image assets when the response includes image payloads. */
  assets: 'optional' as const,
  /**
   * Word-level confidence may appear as `text` elements (`role: word`).
   * Page-level aggregates map to `pages[].confidence` (not text annotations).
   */
  textAnnotations: 'optional' as const,
} as const;

export type MistralOcrPossibleElementKind =
  (typeof MISTRAL_OCR_OUTPUT_CAPABILITIES.elementKinds)[number];

/** Conservative upper bound on converter element kinds — not a guarantee of presence. */
export type MistralOcrParsedDocument =
  ParsedDocumentWithElementKinds<MistralOcrPossibleElementKind>;
