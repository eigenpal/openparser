import { verifyTransform, type TransformVerificationResult } from '@openparser/lineage/openparser';
import type { ParsedDocument } from '@openparser/schema';
import type { ExtractionCitation, ExtractionGroundingField } from '../grounding';
import {
  ALIGNMENT_SCORE,
  alignFieldToSourceTexts,
  documentPlainText,
  type SourceAlignmentResult,
} from './alignment-confidence';
import {
  emptyCompiledTransformPlan,
  transformIntentForPointer,
  type CompiledTransformPlan,
} from './schema-transform';
import { groundingRegionText, indexGroundingSources, renderGroundedDocument } from './sources';

export function citedRegionTexts(
  citations: readonly ExtractionCitation[],
  parsedDocument: ParsedDocument
): string[] {
  const { elementsById } = indexGroundingSources(parsedDocument);
  return citations
    .map((citation) => {
      const element = elementsById.get(citation.element_id);
      if (!element) return undefined;
      const cell =
        citation.table_cell_id && element.kind === 'table'
          ? element.cells.find((entry) => entry.id === citation.table_cell_id)
          : undefined;
      return groundingRegionText(element, cell);
    })
    .filter((text): text is string => Boolean(text?.trim()));
}

/**
 * Align one extracted leaf against the regions it cites. Lineage and Eigenpal
 * review routing share this so an invented citation cannot score as grounded.
 */
export function alignExtractionField(input: {
  value: unknown;
  field?: Pick<ExtractionGroundingField, 'citations' | 'quote'>;
  parsedDocument: ParsedDocument;
  documentText?: string;
}): SourceAlignmentResult & { quote?: string } {
  const documentText =
    input.documentText ?? documentPlainText(renderGroundedDocument(input.parsedDocument));
  return alignFieldToSourceTexts({
    value: input.value,
    ...(input.field?.quote ? { quote: input.field.quote } : {}),
    citedTexts: citedRegionTexts(input.field?.citations ?? [], input.parsedDocument),
    documentText,
  });
}

/** Shared alignment + transform proof for one extracted leaf. */
export type ExtractionFieldAssessment = {
  alignment: SourceAlignmentResult & { quote?: string };
  verification?: TransformVerificationResult;
};

function transformClaimForVerify(
  field?: Pick<ExtractionGroundingField, 'transform_claim'>
): Parameters<typeof verifyTransform>[0]['claim'] | undefined {
  const claim = field?.transform_claim;
  if (!claim) return undefined;
  return {
    operation: claim.operation,
    parameters: claim.parameters,
    reason: claim.reason,
    confidence: claim.confidence ?? '',
  };
}

/**
 * Align the cited source text, then verify any rewrite against schema intent.
 * Lineage and Eigenpal review routing share this so a verified quote cannot
 * outrank a contradicted conversion.
 */
export function assessExtractionField(input: {
  value: unknown;
  field?: Pick<ExtractionGroundingField, 'citations' | 'quote' | 'transform_claim'>;
  parsedDocument: ParsedDocument;
  documentText?: string;
  pointer: string;
  transformPlan?: CompiledTransformPlan;
}): ExtractionFieldAssessment {
  const alignment = alignExtractionField({
    value: input.value,
    ...(input.field ? { field: input.field } : {}),
    parsedDocument: input.parsedDocument,
    ...(input.documentText !== undefined ? { documentText: input.documentText } : {}),
  });
  const transformPlan = input.transformPlan ?? emptyCompiledTransformPlan();
  const intent =
    alignment.quote !== undefined
      ? transformIntentForPointer(transformPlan, input.pointer)
      : undefined;
  const claim = transformClaimForVerify(input.field);
  const verification =
    intent && alignment.quote !== undefined
      ? verifyTransform({
          quote: alignment.quote,
          output: input.value,
          intent,
          ...(claim ? { claim } : {}),
        })
      : undefined;
  return {
    alignment,
    ...(verification ? { verification } : {}),
  };
}

/**
 * Confidence in the *returned* value. Quote alignment describes the read, not
 * the output, whenever the model rewrote what it read.
 *
 * Only direct reads, verified transforms, and rewrites with no trusted
 * transform plan may inherit high final-value confidence from quote alignment.
 * Unverifiable rewrites (trusted plan present but verification
 * `not_applicable`) route to review. Contradicted transforms downgrade only.
 */
export function finalValueAlignment(assessment: ExtractionFieldAssessment): SourceAlignmentResult {
  const { alignment, verification } = assessment;

  if (verification?.result === 'contradicted') {
    return { status: 'ungrounded', score: ALIGNMENT_SCORE.ungrounded };
  }

  const isRewrite = alignment.quote !== undefined;
  if (!isRewrite) {
    return { status: alignment.status, score: alignment.score };
  }

  if (verification?.result === 'verified' || verification === undefined) {
    return { status: alignment.status, score: alignment.score };
  }

  return { status: 'ungrounded', score: ALIGNMENT_SCORE.ungrounded };
}
