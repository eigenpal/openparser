import {
  parseParsedDocumentWithElementKinds,
  type DocumentElementKind,
  type ParsedDocument,
  type ParsedDocumentWithElementKinds,
} from '@openparser/schema';

/** Capability metadata shared by adapter `output.ts` modules. */
export type AdapterOutputCapabilities<K extends DocumentElementKind = DocumentElementKind> = {
  readonly elementKinds: readonly K[];
};

/**
 * Validate a canonical document and preserve a provider-specific element-kind subset.
 * `capabilities.elementKinds` must be the same const tuple exported from `output.ts`.
 */
export function parseCanonicalWithCapabilities<K extends DocumentElementKind>(
  value: ParsedDocument | unknown,
  capabilities: AdapterOutputCapabilities<K>
): ParsedDocumentWithElementKinds<K> {
  return parseParsedDocumentWithElementKinds(value, capabilities.elementKinds);
}
