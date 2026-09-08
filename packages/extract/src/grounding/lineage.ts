import {
  LineageDocumentSchema,
  type ConfidenceAssertion,
  type Derivation,
  type Entity,
  type LineageDocument,
  type Relation,
} from '@openparser/lineage';
import {
  aggregateCitedWordConfidences,
  annotateWordsWithCitation,
  TRANSFORM_PROOF_ATTRIBUTE,
  type TransformVerificationResult,
} from '@openparser/lineage/openparser';
import type {
  Confidence,
  DocumentElement,
  Geometry,
  ParsedDocument,
  TableCell,
} from '@openparser/schema';
import type {
  ExtractionCitation,
  ExtractionGroundingResult,
  TransformConfidenceLevel,
} from '../grounding';
import { documentPlainText, type SourceAlignmentStatus } from './alignment-confidence';
import { assessExtractionField } from './field-alignment';
import { compileTransformPlan, emptyCompiledTransformPlan } from './schema-transform';
import { groundingRegionText, renderGroundedDocument } from './sources';

const OPENPARSER_EXTRACTION_PROFILE = 'https://docs.openparser.dev/lineage/openparser';
const JUSTIFICATION_ATTR = 'openparser:justification';

const SOURCE_DOCUMENT_ID = 'document:source';
const PARSED_DOCUMENT_ID = 'document:parsed';
const SCHEMA_ID = 'schema:extraction';
const OCR_ACTIVITY_ID = 'activity:ocr';
const EXTRACT_ACTIVITY_ID = 'activity:extract';
const TRANSFORM_ACTIVITY_ID = 'activity:transform';
const GROUNDING_ACTIVITY_ID = 'activity:grounding-resolution';

/**
 * Self-describing id for the verbatim text a rewritten field was read from.
 * Deliberately not a `field:` id and deliberately without a `path`: it is a real
 * intermediate value, but it is not one of the output's fields.
 */
function sourceTextEntityId(pointer: string): string {
  return `source-text:${pointer === '' ? '$' : pointer}`;
}

type JsonLeaf = { dottedPath: string; pointer: string; value: unknown };

interface MaterializedEvidence {
  id: string;
  entity: Entity;
  relations: Relation[];
  /** Kept so each citing field can score the words it actually read. */
  region: RegionWords;
}

/** A source region's text with the OCR words recognized inside it. */
interface RegionWords {
  text: string;
  words: Array<{ text: string; score: number }>;
  /** `word` or `symbol`, whichever the parser actually scored. */
  granularity: string;
}

function pointerSegment(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function segmentsToPointer(segments: string[]): string {
  return segments.length === 0 ? '' : `/${segments.map(pointerSegment).join('/')}`;
}

/**
 * Self-describing entity id for one output field, keyed by its RFC 6901
 * pointer. `$` stands for the empty pointer, i.e. the whole output value.
 */
function fieldEntityId(pointer: string): string {
  return `field:${pointer === '' ? '$' : pointer}`;
}

function collectLeaves(
  value: unknown,
  dottedPath = '',
  segments: string[] = [],
  leaves: JsonLeaf[] = []
): JsonLeaf[] {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      leaves.push({
        dottedPath: dottedPath || '$',
        pointer: segmentsToPointer(segments),
        value,
      });
    }
    value.forEach((item, index) =>
      collectLeaves(
        item,
        dottedPath ? `${dottedPath}.${index}` : String(index),
        [...segments, String(index)],
        leaves
      )
    );
    return leaves;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      leaves.push({
        dottedPath: dottedPath || '$',
        pointer: segmentsToPointer(segments),
        value,
      });
    }
    for (const [key, child] of entries) {
      collectLeaves(child, dottedPath ? `${dottedPath}.${key}` : key, [...segments, key], leaves);
    }
    return leaves;
  }
  leaves.push({
    dottedPath: dottedPath || '$',
    pointer: segmentsToPointer(segments),
    value,
  });
  return leaves;
}

function spansOverlap(
  left: ReadonlyArray<{ start: number; end: number }>,
  right: ReadonlyArray<{ start: number; end: number }>
): boolean {
  return left.some((a) => right.some((b) => a.start < b.end && b.start < a.end));
}

function citationKey(citation: ExtractionCitation): string {
  return citation.table_cell_id
    ? `cell:${citation.table_cell_id}`
    : `element:${citation.element_id}:${citation.page_number}`;
}

function citedTextForValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

/**
 * True when the provider already reported on this assertion's 0..1 scale, so
 * echoing its original value and scale back would restate `score` verbatim.
 */
function providerScaleRestatesScore(confidence: Confidence): boolean {
  return (
    (confidence.source_scale === undefined || confidence.source_scale === 'zero_to_one') &&
    (confidence.source_value === undefined || confidence.source_value === confidence.score)
  );
}

function providerConfidence(
  confidence: Confidence,
  granularity: string,
  sources?: ConfidenceAssertion['sources']
): ConfidenceAssertion {
  return {
    score: confidence.score,
    scale: { min: 0, max: 1 },
    kind: 'reported',
    scope: confidence.scope,
    granularity,
    calibrated: confidence.calibrated,
    ...(sources && sources.length > 0 ? { sources } : {}),
    ...(providerScaleRestatesScore(confidence)
      ? {}
      : {
          attributes: {
            ...(confidence.source_value !== undefined
              ? { 'openparser:sourceValue': confidence.source_value }
              : {}),
            ...(confidence.source_scale !== undefined
              ? { 'openparser:sourceScale': confidence.source_scale }
              : {}),
          },
        }),
  };
}

function mean(scores: number[]): number {
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * How well one region was recognized as a whole: its weakest word, with the
 * spread kept alongside so a consumer can tell one bad token from a bad scan.
 *
 * This says nothing about any particular field read from the region. Two fields
 * can cite the same paragraph and read parts of it that scanned very
 * differently, so field scores live on the derivation edge instead.
 */
function regionRecognitionSummary(region: RegionWords): ConfidenceAssertion | undefined {
  const scores = region.words.map((word) => word.score);
  if (scores.length === 0) return undefined;
  return {
    score: Math.min(...scores),
    scale: { min: 0, max: 1 },
    kind: 'derived',
    scope: 'recognition_source_region',
    granularity: region.granularity,
    calibrated: false,
    sources: [{ type: 'activity', id: OCR_ACTIVITY_ID }],
    method: 'region_word_minimum',
    sampleCount: scores.length,
    attributes: {
      minimum: Math.min(...scores),
      maximum: Math.max(...scores),
      regionMean: mean(scores),
    },
  };
}

/**
 * How well the words behind one value were recognized inside one region.
 *
 * The value's weakest word sets the score, then the rest of the region may pull
 * it down a little. A crisp `2448` in a sentence whose street name scanned badly
 * stays a crisp `2448`; it is discounted, because a region that defeated the
 * scanner once may have defeated it twice, but it never inherits the worst word
 * in the neighborhood.
 *
 * What is looked for is the text the extraction read, which is present in the
 * document by construction — the value itself when it was returned as-is, and the
 * verified span when the model went on to rewrite it. When it does not appear in
 * this region there is nothing to narrow to, and the region's own weakest word is
 * the honest answer.
 */
function citedRecognitionSummary(
  region: RegionWords,
  extractedText: string | undefined
): ConfidenceAssertion | undefined {
  const aggregate = aggregateCitedWordConfidences(
    annotateWordsWithCitation(
      region.text,
      region.words.map((word) => ({ text: word.text, confidence: word.score })),
      { ...(extractedText ? { extractedText } : {}) }
    )
  );
  if (!aggregate) return undefined;

  return {
    score: aggregate.score,
    scale: { min: 0, max: 1 },
    kind: 'derived',
    scope: 'recognition_source_region',
    granularity: region.granularity,
    calibrated: false,
    sources: [{ type: 'activity', id: OCR_ACTIVITY_ID }],
    method: aggregate.method,
    sampleCount: aggregate.sampleCount,
    attributes: {
      minimum: aggregate.minimum,
      maximum: aggregate.maximum,
      ...(aggregate.contextMean === undefined
        ? {}
        : {
            contextMean: aggregate.contextMean,
            contextSampleCount: aggregate.contextSampleCount ?? 0,
          }),
    },
  };
}

/**
 * Extraction confidence for one field: reported by the model when available,
 * otherwise derived from deterministic source-text alignment (langextract-style).
 *
 * Whichever number wins, the alignment verdict rides along whenever alignment
 * ran. Whether the text was found in the document is a fact about the text, not
 * about the score, and a consumer warning on "this is not in the document" has to
 * work regardless of whether the model volunteered a number.
 *
 * `sources` names every activity that moved the number, so grounding resolution
 * stays auditable without materializing a separate pre-grounding entity.
 */
function extractionConfidenceAssertion(input: {
  reportedScore?: number;
  alignment?: { score: number; status: SourceAlignmentStatus };
  groundingStatus: 'grounded' | 'partial' | 'ungrounded';
}): ConfidenceAssertion | undefined {
  const groundingMovedScore = input.groundingStatus !== 'grounded';
  const sources: ConfidenceAssertion['sources'] = [
    { type: 'activity', id: EXTRACT_ACTIVITY_ID },
    ...(groundingMovedScore ? [{ type: 'activity' as const, id: GROUNDING_ACTIVITY_ID }] : []),
  ];
  const alignmentAttributes = input.alignment
    ? { attributes: { 'openparser:alignmentStatus': input.alignment.status } }
    : {};

  if (input.reportedScore !== undefined && Number.isFinite(input.reportedScore)) {
    return {
      score: Math.min(1, Math.max(0, input.reportedScore)),
      scale: { min: 0, max: 1 },
      kind: 'reported',
      scope: 'extraction',
      calibrated: false,
      sources: [{ type: 'activity', id: EXTRACT_ACTIVITY_ID }],
      ...alignmentAttributes,
    };
  }
  if (input.alignment) {
    let score = input.alignment.score;
    if (input.groundingStatus === 'partial') score *= 0.9;
    if (input.groundingStatus === 'ungrounded') {
      score = Math.min(score, 0.35);
    }
    return {
      score,
      scale: { min: 0, max: 1 },
      kind: 'derived',
      scope: 'extraction',
      method: 'source_text_alignment',
      calibrated: false,
      sources,
      ...alignmentAttributes,
    };
  }
  if (input.groundingStatus === 'ungrounded') {
    return {
      score: 0.35,
      scale: { min: 0, max: 1 },
      kind: 'derived',
      scope: 'extraction',
      method: 'ungrounded',
      calibrated: false,
      sources,
    };
  }
  return undefined;
}

/**
 * What the model did to a verbatim read to produce the returned value: a
 * reformatting the schema asked for, or a conclusion drawn from the text.
 *
 * Narrow representation changes can be proved locally. That proof wins and
 * receives 1.0. Otherwise the model's coarse self-report is mapped onto fixed
 * numbers; it remains explicitly reported and uncalibrated. If neither exists,
 * the transform remains unscored.
 */
const REPORTED_TRANSFORM_SCORES: Record<TransformConfidenceLevel, number> = {
  low: 0.25,
  medium: 0.5,
  high: 0.75,
};

function transformConfidenceAssertion(input: {
  verification?: TransformVerificationResult;
  reportedLevel?: TransformConfidenceLevel;
}): ConfidenceAssertion | undefined {
  if (input.verification?.result === 'verified') {
    return {
      score: 1,
      scale: { min: 0, max: 1 },
      kind: 'derived',
      scope: 'transformation',
      method: input.verification.proof.methodId,
      calibrated: false,
      sources: [{ type: 'activity', id: TRANSFORM_ACTIVITY_ID }],
    };
  }
  // A deterministic contradiction is a measurement: do not keep a competing
  // model_ordinal score. not_applicable / no trusted intent may still surface
  // the model's reported ordinal when product doctrine allows it.
  if (input.verification?.result === 'contradicted') return undefined;
  if (input.reportedLevel === undefined) return undefined;
  return {
    score: REPORTED_TRANSFORM_SCORES[input.reportedLevel],
    scale: { min: 0, max: 1 },
    kind: 'reported',
    scope: 'transformation',
    method: 'model_ordinal',
    calibrated: false,
    sources: [{ type: 'activity', id: TRANSFORM_ACTIVITY_ID }],
    attributes: { 'openparser:ordinal': input.reportedLevel },
  };
}

function wordEvidenceFor(
  source: DocumentElement,
  cell: TableCell | undefined,
  doc: ParsedDocument,
  childrenByParent: ReadonlyMap<string, ReadonlySet<string>>
): Array<Extract<DocumentElement, { kind: 'text' }> & { confidence: Confidence }> {
  if (source.kind === 'table' && cell === undefined) return [];
  const sourceSpans = cell?.spans ?? (source.kind === 'text' ? source.spans : []);
  const descendantIds = new Set<string>();
  const pending = [...(childrenByParent.get(source.id) ?? [])];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (descendantIds.has(id)) continue;
    descendantIds.add(id);
    pending.push(...(childrenByParent.get(id) ?? []));
  }

  return doc.elements.flatMap((element) => {
    if (
      element.kind !== 'text' ||
      (element.role !== 'word' && element.role !== 'symbol') ||
      !element.confidence
    ) {
      return [];
    }
    const matchesCell =
      cell === undefined ||
      (cell.element_ids.length > 0
        ? cell.element_ids.includes(element.id)
        : cell.spans.length > 0 && spansOverlap(cell.spans, element.spans));
    if (
      !matchesCell ||
      (cell === undefined &&
        !descendantIds.has(element.id) &&
        (sourceSpans.length === 0 || !spansOverlap(sourceSpans, element.spans)))
    ) {
      return [];
    }
    if (!element.text?.trim()) return [];
    return [element as typeof element & { confidence: Confidence }];
  });
}

function evidenceSelector(input: {
  elementId: string;
  tableCellId?: string;
  pageNumber: number;
  geometry: Geometry;
  sourceType: string;
  granularity: string;
}): Entity['selector'] {
  return {
    type: 'openparser.document-region',
    value: {
      elementId: input.elementId,
      ...(input.tableCellId ? { tableCellId: input.tableCellId } : {}),
      pageNumber: input.pageNumber,
      bbox: input.geometry.bbox,
      ...(input.geometry.polygon ? { polygon: input.geometry.polygon } : {}),
      sourceType: input.sourceType,
      geometryGranularity: input.granularity,
      ...(input.tableCellId
        ? {
            logicalAddress: {
              type: 'table_cell',
              id: input.tableCellId,
            },
          }
        : {}),
    },
  };
}

function materializeEvidence(
  citation: ExtractionCitation,
  doc: ParsedDocument,
  childrenByParent: ReadonlyMap<string, ReadonlySet<string>>,
  elementById: ReadonlyMap<string, DocumentElement>
): MaterializedEvidence | null {
  const element = elementById.get(citation.element_id);
  if (!element) return null;
  const cell =
    citation.table_cell_id && element.kind === 'table'
      ? element.cells.find((entry) => entry.id === citation.table_cell_id)
      : undefined;
  const id = cell ? `source-cell:${cell.id}` : `source-element:${element.id}`;
  const words = wordEvidenceFor(element, cell, doc, childrenByParent);
  const relations: Relation[] = [];
  if (cell) {
    relations.push({
      type: 'member_of',
      source: id,
      target: `source-element:${element.id}`,
    });
  }
  const region: RegionWords = {
    text: groundingRegionText(element, cell),
    words: words.map((word) => ({ text: word.text, score: word.confidence.score })),
    granularity: words.some((word) => word.role === 'symbol') ? 'symbol' : 'word',
  };

  const nearestConfidence = cell?.confidence ?? citation.confidence ?? element.confidence;
  const nearestGranularity = cell?.confidence
    ? 'table_cell'
    : citation.confidence
      ? citation.granularity
      : element.confidence
        ? 'element'
        : undefined;
  const confidence =
    regionRecognitionSummary(region) ??
    (nearestConfidence && nearestGranularity
      ? providerConfidence(nearestConfidence, nearestGranularity, [
          { type: 'activity', id: OCR_ACTIVITY_ID },
        ])
      : undefined);
  const wideContext = groundingRegionText(element);

  // A logical cell known only by id has no geometry to select on; every other
  // citation selects geometry at exactly `citation.granularity`.
  const logicalCellOnly = cell !== undefined && citation.granularity !== 'table_cell';
  const selector = logicalCellOnly
    ? {
        type: 'openparser.table-cell',
        value: {
          elementId: citation.element_id,
          tableCellId: cell.id,
          rowIndex: cell.row_index,
          columnIndex: cell.column_index,
          geometryGranularity: 'unavailable',
        },
      }
    : evidenceSelector({
        elementId: citation.element_id,
        ...(citation.table_cell_id ? { tableCellId: citation.table_cell_id } : {}),
        pageNumber: citation.page_number,
        geometry: {
          page_number: citation.page_number,
          bbox: citation.bbox,
          ...(citation.polygon ? { polygon: citation.polygon } : {}),
        },
        sourceType: citation.source_type,
        granularity: citation.granularity,
      });

  return {
    id,
    entity: {
      kind: 'collection',
      value: groundingRegionText(element, cell),
      locator: {
        uri: `urn:openparser:document:${encodeURIComponent(doc.document_id)}`,
        mediaType: 'application/vnd.openparser.document+json',
      },
      selector,
      ...(confidence ? { confidence: [confidence] } : {}),
      attributes: {
        // Only meaningful when the selector could not carry it.
        ...(logicalCellOnly ? { 'openparser:groundingGranularity': citation.granularity } : {}),
        ...(wideContext && wideContext !== region.text
          ? { 'openparser:sourceContext': wideContext }
          : {}),
        // The logical-cell selector already carries id/row/column.
        ...(cell && !logicalCellOnly
          ? {
              'openparser:logicalTableCell': {
                id: cell.id,
                rowIndex: cell.row_index,
                columnIndex: cell.column_index,
              },
            }
          : {}),
        // Only a genuine fallback: no region aggregate and no provider score.
        ...(!confidence &&
        doc.pages.find((page) => page.number === citation.page_number)?.confidence
          ? { 'openparser:inheritedRecognition': `page:${citation.page_number}` }
          : {}),
      },
    },
    relations,
    region,
  };
}

/**
 * Build a complete, portable derivation DAG for one grounded extraction:
 * source document → parsed document → cited evidence regions → one field
 * entity per output leaf.
 *
 * Lineage is a companion to the parsed document, not a replacement for it.
 * OCR word tokens are addressed through each region's `locator.uri` and
 * `selector.elementId` rather than copied in as entities — only the region's
 * aggregate recognition score is carried here.
 *
 * OCR confidence stays attached to evidence at the closest granularity the
 * provider supplied. Extraction confidence is reported by the model when available,
 * otherwise derived from deterministic source-text alignment (langextract-style).
 */
export function buildExtractionLineage(input: {
  output: unknown;
  grounding: ExtractionGroundingResult;
  parsedDocument: ParsedDocument;
  llmModel: string;
  extractionSchema?: Record<string, unknown>;
}): LineageDocument {
  const { output, grounding, parsedDocument, llmModel, extractionSchema } = input;
  const sourceDocumentId = SOURCE_DOCUMENT_ID;
  const parsedDocumentId = PARSED_DOCUMENT_ID;
  const ocrActivityId = OCR_ACTIVITY_ID;
  const extractActivityId = EXTRACT_ACTIVITY_ID;
  const transformActivityId = TRANSFORM_ACTIVITY_ID;
  const groundingActivityId = GROUNDING_ACTIVITY_ID;
  const plainDocumentText = documentPlainText(renderGroundedDocument(parsedDocument));
  const transformPlan = extractionSchema
    ? compileTransformPlan(extractionSchema)
    : emptyCompiledTransformPlan();
  const elementById = new Map(parsedDocument.elements.map((element) => [element.id, element]));
  const childrenByParent = new Map<string, Set<string>>();
  for (const relation of parsedDocument.relations) {
    if (relation.type !== 'contains') continue;
    const children = childrenByParent.get(relation.from_id) ?? new Set<string>();
    children.add(relation.to_id);
    childrenByParent.set(relation.from_id, children);
  }

  const citationsByKey = new Map<string, ExtractionCitation>();
  for (const field of grounding.fields) {
    for (const citation of field.citations) citationsByKey.set(citationKey(citation), citation);
  }

  const entities: LineageDocument['entities'] = {
    [sourceDocumentId]: {
      kind: 'artifact',
      locator: { uri: `urn:openparser:source:${encodeURIComponent(parsedDocument.document_id)}` },
    },
    // The document id is the tail of `locator.uri`; only the format is new here.
    [parsedDocumentId]: {
      kind: 'artifact',
      locator: {
        uri: `urn:openparser:document:${encodeURIComponent(parsedDocument.document_id)}`,
        mediaType: 'application/vnd.openparser.document+json',
      },
      attributes: {
        'openparser:outputFormat': parsedDocument.output_format,
      },
    },
    // The schema IS this entity's value; `schema` would describe it, not repeat it.
    [SCHEMA_ID]: {
      kind: 'artifact' as const,
      ...(extractionSchema
        ? { value: extractionSchema as LineageDocument['entities'][string]['value'] }
        : {}),
      attributes: {
        'openparser:schemaAvailability': extractionSchema ? 'materialized' : 'unavailable',
      },
    },
  };
  for (const page of parsedDocument.pages) {
    if (!page.confidence) continue;
    entities[`page:${page.number}`] = {
      kind: 'evidence',
      locator: {
        uri: `urn:openparser:document:${encodeURIComponent(parsedDocument.document_id)}`,
        mediaType: 'application/vnd.openparser.document+json',
      },
      selector: {
        type: 'openparser.document-page',
        value: { pageNumber: page.number },
      },
      confidence: [
        providerConfidence(page.confidence, 'page', [{ type: 'activity', id: ocrActivityId }]),
      ],
    };
  }
  const relations: Relation[] = [];
  const evidenceIdByKey = new Map<string, string>();
  const regionByEvidenceId = new Map<string, RegionWords>();
  for (const [key, citation] of citationsByKey) {
    if (citation.table_cell_id) {
      const element = elementById.get(citation.element_id);
      const location = element?.locations.find(
        (candidate) => candidate.page_number === citation.page_number
      );
      if (element && location) {
        entities[`source-element:${element.id}`] ??= {
          kind: 'collection',
          value: groundingRegionText(element),
          locator: {
            uri: `urn:openparser:document:${encodeURIComponent(parsedDocument.document_id)}`,
            mediaType: 'application/vnd.openparser.document+json',
          },
          selector: evidenceSelector({
            elementId: element.id,
            pageNumber: location.page_number,
            geometry: location,
            sourceType: element.kind,
            granularity: 'element',
          }),
        };
      }
    }
    const evidence = materializeEvidence(citation, parsedDocument, childrenByParent, elementById);
    if (!evidence) continue;
    entities[evidence.id] = evidence.entity;
    relations.push(...evidence.relations);
    evidenceIdByKey.set(key, evidence.id);
    regionByEvidenceId.set(evidence.id, evidence.region);
  }

  // First record wins, as unwrapping already decided when it resolved citations.
  // Disagreeing here would score a field against evidence it was not given.
  const groundingByPath = new Map<string, (typeof grounding.fields)[number]>();
  for (const field of grounding.fields) {
    if (!groundingByPath.has(field.path)) groundingByPath.set(field.path, field);
  }
  const derivations: Derivation[] = [
    {
      output: parsedDocumentId,
      activity: ocrActivityId,
      inputs: [{ entity: sourceDocumentId, role: 'document', effect: 'direct' }],
      transformation: { type: 'transformation' },
    },
  ];
  // One producer per entity. A table that holds a cited cell needs a derivation
  // of its own, but if that same table was also cited directly it already gets
  // one below, and two producers for one entity is not a valid graph.
  const citedEvidenceIds = new Set(evidenceIdByKey.values());
  const parentElementIds = new Set(
    relations
      .filter(
        (relation) => relation.type === 'member_of' && relation.source.startsWith('source-cell:')
      )
      .map((relation) => relation.target)
  );
  for (const entityId of Object.keys(entities)) {
    if (!entityId.startsWith('page:') && !parentElementIds.has(entityId)) continue;
    if (citedEvidenceIds.has(entityId)) continue;
    derivations.push({
      output: entityId,
      activity: ocrActivityId,
      inputs: [{ entity: parsedDocumentId, role: 'parsed_document', effect: 'direct' }],
      transformation: { type: 'identity' },
    });
  }
  for (const evidenceId of citedEvidenceIds) {
    const parentSourceIds = relations
      .filter((relation) => relation.type === 'member_of' && relation.source === evidenceId)
      .map((relation) => relation.target);
    derivations.push({
      output: evidenceId,
      activity: ocrActivityId,
      inputs:
        parentSourceIds.length > 0
          ? parentSourceIds.map((entity) => ({
              entity,
              role: 'parent_source_element',
              effect: 'direct' as const,
            }))
          : [{ entity: parsedDocumentId, role: 'parsed_document', effect: 'direct' }],
      transformation: { type: 'filter' },
    });
  }
  const outputs: string[] = [];

  collectLeaves(output).forEach((leaf) => {
    const grounded = groundingByPath.get(leaf.dottedPath);
    const evidenceIds = (grounded?.citations ?? [])
      .map((citation) => evidenceIdByKey.get(citationKey(citation)))
      .filter((id): id is string => id !== undefined);
    const dropped = grounded?.dropped_source_ids ?? [];
    const groundingStatus =
      evidenceIds.length === 0 ? 'ungrounded' : dropped.length > 0 ? 'partial' : 'grounded';
    const { alignment, verification } = assessExtractionField({
      value: leaf.value,
      ...(grounded ? { field: grounded } : {}),
      parsedDocument,
      documentText: plainDocumentText,
      pointer: leaf.pointer,
      transformPlan,
    });
    const entityId = fieldEntityId(leaf.pointer);
    // Model-reported and underivable from the graph. Reading text off the page
    // and converting it are two claims, so each is stated where it belongs: a
    // justification explains the step that produced the entity carrying it.
    const readJustification = typeof grounded?.reason === 'string' ? grounded.reason.trim() : '';
    const transformJustification =
      typeof grounded?.transform_claim?.reason === 'string'
        ? grounded.transform_claim.reason.trim()
        : '';
    const justificationAttribute = (justification: string): Record<string, string> =>
      justification ? { [JUSTIFICATION_ATTR]: justification } : {};

    // An extraction reads text that is in the document, so that text is what the
    // words behind this value are found by: the value itself when it was returned
    // as-is, the verified span when the model rewrote it.
    const extractedText = alignment.quote ?? citedTextForValue(leaf.value);
    // Scored per edge, not per region: a region cited by several fields was read
    // once, but each field read a different part of it, and the parts can scan
    // very differently.
    const readInputs = [
      { entity: parsedDocumentId, role: 'parsed_document', effect: 'direct' as const },
      { entity: SCHEMA_ID, role: 'output_schema', effect: 'direct' as const },
      ...[...new Set(evidenceIds)].map((entity) => {
        const region = regionByEvidenceId.get(entity);
        const recognition = region ? citedRecognitionSummary(region, extractedText) : undefined;
        return {
          entity,
          role: 'resolved_source_evidence',
          effect: 'direct' as const,
          ...(recognition ? { confidence: recognition } : {}),
        };
      }),
    ];
    // Dropped ids are the only fact grounding status cannot be derived from.
    const readAttributes =
      dropped.length > 0 ? { attributes: { 'openparser:droppedSourceIds': dropped } } : {};

    // An extraction is always verbatim: it can only produce text that is in the
    // document. When the model returned something else, that is a second claim —
    // this text became that value — and only the first can be checked. So the read
    // keeps its own entity and the rewrite gets its own edge, each scored for what
    // it actually asserts, rather than one edge carrying their average.
    const rewritten = alignment.quote !== undefined;
    if (rewritten) {
      const sourceTextId = sourceTextEntityId(leaf.pointer);
      const readAttributeBag = justificationAttribute(readJustification);
      entities[sourceTextId] = {
        kind: 'value',
        value: alignment.quote as LineageDocument['entities'][string]['value'],
        // Alignment already describes the read, not the returned value. The
        // model's own number describes what it produced from this text, which is
        // the next step's claim.
        confidence: [extractionConfidenceAssertion({ alignment, groundingStatus })!],
        ...(Object.keys(readAttributeBag).length > 0 ? { attributes: readAttributeBag } : {}),
      };
      derivations.push({
        output: sourceTextId,
        activity: extractActivityId,
        inputs: readInputs,
        transformation: { type: 'transformation' },
        ...readAttributes,
      });
      derivations.push({
        output: entityId,
        activity: transformActivityId,
        inputs: [{ entity: sourceTextId, role: 'source_text', effect: 'direct' }],
        transformation: {
          type: 'transformation',
          ...(verification
            ? {
                attributes: {
                  [TRANSFORM_PROOF_ATTRIBUTE]: verification.proof,
                },
              }
            : {}),
        },
      });
    } else {
      derivations.push({
        output: entityId,
        activity: extractActivityId,
        inputs: readInputs,
        transformation: { type: 'transformation' },
        ...readAttributes,
      });
    }

    const outputConfidence = rewritten
      ? transformConfidenceAssertion({
          verification,
          reportedLevel: grounded?.transform_claim?.confidence,
        })
      : extractionConfidenceAssertion({
          reportedScore: grounded?.confidence,
          alignment,
          groundingStatus,
        });

    // The step that produced this entity is the read when the value came off the
    // page as written, and the rewrite when it did not, so the justification it
    // carries is that step's.
    const fieldAttributes = justificationAttribute(
      rewritten ? transformJustification : readJustification
    );

    // `path` is the only location record; the dotted form, grounding status, and
    // whether confidence was reported or derived are all derivable by consumers.
    entities[entityId] = {
      kind: 'decision',
      path: leaf.pointer,
      value: leaf.value as LineageDocument['entities'][string]['value'],
      ...(outputConfidence ? { confidence: [outputConfidence] } : {}),
      ...(Object.keys(fieldAttributes).length > 0 ? { attributes: fieldAttributes } : {}),
    };
    outputs.push(entityId);
  });

  return LineageDocumentSchema.parse({
    format: 'lineage@1',
    id: `openparser:extraction:${parsedDocument.document_id}`,
    profiles: [OPENPARSER_EXTRACTION_PROFILE],
    entities,
    activities: {
      [ocrActivityId]: {
        type: 'ocr',
        status: 'ended',
        associations: [{ agent: 'agent:ocr-model', role: 'model' }],
      },
      [extractActivityId]: {
        type: 'extract',
        status: 'ended',
        associations: [{ agent: 'agent:extraction-model', role: 'model' }],
      },
      // One call did the reading and the rewriting, so this activity shares the
      // extraction's agent and says outright that it was never a call of its
      // own. Two steps in the graph, one request on the wire.
      ...(derivations.some((derivation) => derivation.activity === transformActivityId)
        ? {
            [transformActivityId]: {
              type: 'transform',
              status: 'ended',
              associations: [{ agent: 'agent:extraction-model', role: 'model' }],
              attributes: { 'openparser:implicit': true },
            },
          }
        : {}),
      [groundingActivityId]: {
        type: 'grounding_resolution',
        status: 'ended',
        associations: [{ agent: 'agent:openparser-service', role: 'resolver' }],
      },
    },
    agents: {
      'agent:ocr-model': {
        type: 'model',
        name: parsedDocument.provenance.model,
        attributes: { provider: parsedDocument.provenance.provider },
      },
      'agent:extraction-model': { type: 'model', name: llmModel },
      'agent:openparser-service': { type: 'software', name: 'OpenParser service' },
    },
    derivations,
    relations,
    outputs,
  });
}
