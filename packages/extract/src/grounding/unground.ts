import { TransformClaimSchema } from '@openparser/lineage/openparser';
import {
  BoundingBoxSchema,
  type DocumentElement,
  type ParsedDocument,
  type TableCell,
  type TableElement,
} from '@openparser/schema';
import {
  type ExtractionCitation,
  type ExtractionGroundingField,
  type ExtractionGroundingResult,
  type ExtractionTransformClaim,
} from '../grounding';
import {
  GROUNDING_FIELDS_KEY,
  GROUNDING_QUOTE_KEY,
  GROUNDING_REASON_KEY,
  GROUNDING_SOURCE_IDS_KEY,
  GROUNDING_TRANSFORM_CLAIM_KEY,
  GROUNDING_VALUES_KEY,
} from './schema-transform';
import { indexGroundingSources, type GroundingSourceIndex } from './sources';

type PendingField = {
  path: string;
  value: unknown;
  sourceIds: string[];
  confidence?: number;
  reason?: string;
  quote?: string;
  transformClaim?: ExtractionTransformClaim;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGroundedLeaf(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value) && 'value' in value && GROUNDING_SOURCE_IDS_KEY in value;
}

function isFlatGroundedEnvelope(value: unknown): value is Record<string, unknown> {
  return (
    isPlainObject(value) &&
    GROUNDING_VALUES_KEY in value &&
    GROUNDING_FIELDS_KEY in value &&
    Array.isArray(value[GROUNDING_FIELDS_KEY])
  );
}

function joinPath(base: string, segment: string | number): string {
  if (base === '') return String(segment);
  return `${base}.${segment}`;
}

function isLeafValue(value: unknown): boolean {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function collectLeaves(node: unknown, path: string, pending: PendingField[]): void {
  if (Array.isArray(node)) {
    for (let index = 0; index < node.length; index++) {
      collectLeaves(node[index], joinPath(path, index), pending);
    }
    return;
  }
  if (isPlainObject(node)) {
    for (const [key, child] of Object.entries(node)) {
      collectLeaves(child, joinPath(path, key), pending);
    }
    return;
  }
  if (isLeafValue(node)) {
    pending.push({ path: path || '$', value: node, sourceIds: [] });
  }
}

type LeafProvenance = Omit<PendingField, 'path' | 'value'>;

/**
 * Model-authored prose and quotes are stored verbatim in the terminal result and
 * re-exported as lineage attributes, so they need a bound. A model that runs long
 * gets truncated rather than failing a valid extraction.
 */
const MAX_REASON_CHARS = 2_000;
const MAX_QUOTE_CHARS = 4_096;

function trimmedString(value: unknown, maxChars: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.length > maxChars ? trimmed.slice(0, maxChars) : trimmed;
}

/**
 * Index the envelope's per-leaf records by path. Every field except the path is
 * optional here even though the model schema marks them all required: a repair
 * attempt or a lenient provider can return a partial record, and missing
 * provenance must degrade the field rather than fail the extraction.
 */
function parseFieldsIndex(fields: unknown): Map<string, LeafProvenance> {
  const map = new Map<string, LeafProvenance>();
  if (!Array.isArray(fields)) return map;
  for (const entry of fields) {
    if (!isPlainObject(entry)) continue;
    const path = entry.path;
    if (typeof path !== 'string' || path.length === 0 || map.has(path)) continue;
    const idsRaw = entry[GROUNDING_SOURCE_IDS_KEY];
    const confidenceRaw = entry.confidence;
    const reason = trimmedString(entry[GROUNDING_REASON_KEY], MAX_REASON_CHARS);
    const quote = trimmedString(entry[GROUNDING_QUOTE_KEY], MAX_QUOTE_CHARS);
    const rawClaim = TransformClaimSchema.safeParse(entry[GROUNDING_TRANSFORM_CLAIM_KEY]);
    const transformClaim =
      rawClaim.success && rawClaim.data.operation && rawClaim.data.reason.trim()
        ? {
            operation: rawClaim.data.operation,
            parameters: rawClaim.data.parameters,
            reason: rawClaim.data.reason.trim().slice(0, MAX_REASON_CHARS),
            ...(rawClaim.data.confidence
              ? { confidence: rawClaim.data.confidence as 'low' | 'medium' | 'high' }
              : {}),
          }
        : undefined;
    map.set(path, {
      sourceIds: Array.isArray(idsRaw) ? idsRaw.map(String) : [],
      ...(typeof confidenceRaw === 'number' && Number.isFinite(confidenceRaw)
        ? { confidence: confidenceRaw }
        : {}),
      ...(reason ? { reason } : {}),
      ...(quote ? { quote } : {}),
      ...(transformClaim ? { transformClaim } : {}),
    });
  }
  return map;
}

/**
 * Unwrap model output into caller-shaped values plus one provenance record per leaf.
 *
 * Primary shape: `{ values, fields: [{ path, source_ids, reason, quote, transform_claim }] }`.
 * Values stay caller-shaped. Legacy leaf-wrapper shape (`{ value, source_ids }`
 * per leaf) is still accepted so those payloads remain unwrapable.
 */
export function unwrapGroundedOutput(raw: unknown): {
  output: unknown;
  pending: PendingField[];
} {
  if (isFlatGroundedEnvelope(raw)) {
    const values = raw[GROUNDING_VALUES_KEY];
    const provenanceByPath = parseFieldsIndex(raw[GROUNDING_FIELDS_KEY]);
    const pending: PendingField[] = [];
    collectLeaves(values, '', pending);
    for (const field of pending) {
      Object.assign(field, { sourceIds: [] }, provenanceByPath.get(field.path));
    }
    return { output: values, pending };
  }

  // Legacy per-leaf wrappers.
  const pending: PendingField[] = [];

  function walk(node: unknown, path: string): unknown {
    if (Array.isArray(node)) {
      return node.map((item, index) => walk(item, joinPath(path, index)));
    }
    if (isGroundedLeaf(node)) {
      const idsRaw = node[GROUNDING_SOURCE_IDS_KEY];
      const sourceIds = Array.isArray(idsRaw) ? idsRaw.map(String) : [];
      pending.push({ path: path || '$', value: node.value, sourceIds });
      return node.value;
    }
    if (isPlainObject(node)) {
      return Object.fromEntries(
        Object.entries(node).map(([key, child]) => [key, walk(child, joinPath(path, key))])
      );
    }
    return node;
  }

  return { output: walk(raw, ''), pending };
}

function locationCitation(
  element: DocumentElement,
  locationIndex = 0
): Omit<ExtractionCitation, 'granularity'> | null {
  const location = element.locations[locationIndex];
  if (!location) return null;
  const bbox = BoundingBoxSchema.safeParse(location.bbox);
  if (!bbox.success) return null;
  return {
    element_id: element.id,
    page_number: location.page_number,
    bbox: bbox.data,
    ...(location.polygon ? { polygon: location.polygon } : {}),
    source_type: element.kind,
    ...(element.confidence ? { confidence: element.confidence } : {}),
  };
}

function elementCitation(element: DocumentElement): ExtractionCitation | null {
  const base = locationCitation(element);
  if (!base) return null;
  return { ...base, granularity: 'element' };
}

function tableCellCitation(element: TableElement, cell: TableCell): ExtractionCitation | null {
  const cellLocation = cell.locations[0];
  if (cellLocation) {
    const bbox = BoundingBoxSchema.safeParse(cellLocation.bbox);
    if (bbox.success) {
      return {
        element_id: element.id,
        table_cell_id: cell.id,
        page_number: cellLocation.page_number,
        bbox: bbox.data,
        ...(cellLocation.polygon ? { polygon: cellLocation.polygon } : {}),
        source_type: 'table',
        granularity: 'table_cell',
        ...(cell.confidence
          ? { confidence: cell.confidence }
          : element.confidence
            ? { confidence: element.confidence }
            : {}),
      };
    }
  }

  // Fall back honestly to the parent table region when the cell has no
  // geometry. Keeping `table_cell` here would claim cell-level precision while
  // drawing the whole table, which is actively misleading in review UIs.
  const base = locationCitation(element);
  if (!base) return null;
  return {
    ...base,
    table_cell_id: cell.id,
    source_type: 'table',
    granularity: 'element',
    ...(cell.confidence ? { confidence: cell.confidence } : {}),
  };
}

function resolveSourceId(
  sourceId: string,
  index: GroundingSourceIndex
): { known: boolean; citation: ExtractionCitation | null } {
  const element = index.elementsById.get(sourceId);
  if (element) return { known: true, citation: elementCitation(element) };

  const cellRef = index.tableCellsById.get(sourceId);
  if (cellRef) {
    return { known: true, citation: tableCellCitation(cellRef.element, cellRef.cell) };
  }

  return { known: false, citation: null };
}

function citationKey(citation: ExtractionCitation): string {
  return citation.table_cell_id
    ? `cell:${citation.table_cell_id}`
    : `element:${citation.element_id}`;
}

/**
 * Resolve verified element-level citations. Unknown ids are dropped (never guessed).
 */
export function resolveGroundingFields(
  pending: PendingField[],
  doc: ParsedDocument
): ExtractionGroundingField[] {
  const index = indexGroundingSources(doc);
  return pending.map((field) => {
    const citations: ExtractionCitation[] = [];
    const dropped: string[] = [];
    const cited = new Set<string>();
    for (const sourceId of new Set(field.sourceIds)) {
      const resolved = resolveSourceId(sourceId, index);
      if (resolved.citation) {
        const key = citationKey(resolved.citation);
        if (!cited.has(key)) {
          citations.push(resolved.citation);
          cited.add(key);
        }
      } else if (!resolved.known || !resolved.citation) {
        // A canonical source without valid geometry cannot satisfy the citation
        // contract. Report it as dropped rather than silently implying that it
        // was verified or fabricating a bounding box.
        dropped.push(sourceId);
      }
    }
    return {
      path: field.path,
      citations,
      ...(field.confidence !== undefined ? { confidence: field.confidence } : {}),
      ...(field.reason ? { reason: field.reason } : {}),
      ...(field.transformClaim ? { transform_claim: field.transformClaim } : {}),
      ...(field.quote ? { quote: field.quote } : {}),
      ...(dropped.length ? { dropped_source_ids: dropped } : {}),
    };
  });
}

export function buildGroundingResult(
  pending: PendingField[],
  doc: ParsedDocument
): ExtractionGroundingResult {
  return {
    mode: 'field',
    fields: resolveGroundingFields(pending, doc),
  };
}
