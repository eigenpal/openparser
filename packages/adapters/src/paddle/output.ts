import type { DocumentElementKind, ParsedDocumentWithElementKinds } from '@openparser/schema';

/**
 * Element kinds the Paddle HPS layout converter may emit.
 * Figure assets depend on figureAssets mode and URI map; geometry depends on HPS boxes.
 */
export const PADDLE_LAYOUT_OUTPUT_CAPABILITIES = {
  elementKinds: [
    'text',
    'table',
    'figure',
    'formula',
    'stamp',
  ] as const satisfies readonly DocumentElementKind[],
  geometry: 'optional' as const,
  assets: 'optional' as const,
  textAnnotations: 'none' as const,
} as const;

export type PaddleLayoutPossibleElementKind =
  (typeof PADDLE_LAYOUT_OUTPUT_CAPABILITIES.elementKinds)[number];

export type PaddleLayoutParsedDocument =
  ParsedDocumentWithElementKinds<PaddleLayoutPossibleElementKind>;
