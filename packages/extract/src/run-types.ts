import type { ParsedDocument } from '@openparser/schema';
import type { ExtractionGroundingMode, ExtractionGroundingResult } from './grounding';

export type ExtractionAttemptKind = 'primary' | 'repair';

export type ExtractionAttemptStatus = 'succeeded' | 'failed' | 'indeterminate';

export type ExtractionRepairError = {
  path: string;
  kind: string;
  message: string;
};

export type ExtractionRepairFeedback = {
  invalidJson: Record<string, unknown> | null;
  errors: ExtractionRepairError[];
};

export type ExtractionValidationResult = {
  data: Record<string, unknown> | null;
  schemaError: Error | null;
  validationErrors: ExtractionRepairError[];
};

export type ExtractionAttemptOutcome = {
  attemptIndex: number;
  kind: ExtractionAttemptKind;
  status: ExtractionAttemptStatus;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  error?: string | null;
  /** Host-specific extras copied from a thrown completion error (e.g. sanitized providerError). */
  providerError?: unknown;
};

/**
 * Duck-typed failure a host completion port may throw.
 *
 * OpenParser Service sets `extractionAttemptStatus` on transport/provider errors
 * so the orchestrator can record the attempt and stop the repair loop.
 * Eigenpal adapters may throw the same shape, or throw a plain Error to skip
 * attempt bookkeeping and abort.
 */
export type StructuredExtractionFailure = {
  message: string;
  extractionAttemptStatus: Exclude<ExtractionAttemptStatus, 'succeeded'>;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  providerError?: unknown;
};

export type StructuredExtractionRequest = {
  attemptIndex: number;
  kind: ExtractionAttemptKind;
  /** Provider-facing JSON Schema (grounded envelope or caller schema). */
  schema: Record<string, unknown>;
  /** Canonical extraction instruction (verbatim or grounded), plus optional caller prompt. */
  prompt: string;
  documentText: string;
  repairFeedback: ExtractionRepairFeedback | null;
  /** `prompt` + DOCUMENT + optional SCHEMA REPAIR — ready as one user message. */
  userMessage: string;
};

export type StructuredExtractionCompletion = {
  content: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
};

/**
 * One structured-output attempt. Hosts inject OpenRouter HTTP, Eigenpal
 * `extractStructured`, or any other json_schema completion here.
 *
 * Do not wrap Eigenpal `AIClient.extract()` — that method already owns a
 * structured-then-prompt fallback loop. Wrap a single-shot structured call.
 */
export type CompleteStructuredExtraction = (
  request: StructuredExtractionRequest
) => Promise<StructuredExtractionCompletion>;

export type ExtractionRunHooks = {
  beforeDispatch?(input: { attemptIndex: number; kind: ExtractionAttemptKind }): Promise<void>;
  afterAttempt?(attempt: ExtractionAttemptOutcome): Promise<void>;
  requireLease?(): void;
};

export type GroundedExtractionInput = {
  schema: Record<string, unknown>;
  parsedDocument: ParsedDocument;
  repairAttempts: number;
  grounding?: ExtractionGroundingMode;
  /** Optional caller instructions appended after the canonical extraction prompt. */
  prompt?: string;
  complete: CompleteStructuredExtraction;
  hooks?: ExtractionRunHooks;
};

export type GroundedExtractionResult = {
  output: Record<string, unknown>;
  attempts: ExtractionAttemptOutcome[];
  grounding?: ExtractionGroundingResult;
};

/** Hard cap matching hosted OpenParser: primary + at most two repairs. */
export const MAX_EXTRACTION_REPAIR_ATTEMPTS = 2;

export class ExtractionSchemaFailure extends Error {
  constructor(message = 'extraction output violates schema') {
    super(message);
    this.name = 'ExtractionSchemaFailure';
  }
}

export function structuredExtractionFailureFromUnknown(
  error: unknown
): StructuredExtractionFailure | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { extractionAttemptStatus?: unknown }).extractionAttemptStatus;
  if (status !== 'failed' && status !== 'indeterminate') return null;
  const message =
    error instanceof Error
      ? error.message
      : typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'structured extraction failed';
  const usage = error as StructuredExtractionFailure;
  return {
    message,
    extractionAttemptStatus: status,
    inputTokens: usage.inputTokens ?? null,
    outputTokens: usage.outputTokens ?? null,
    costUsd: usage.costUsd ?? null,
    providerError: usage.providerError,
  };
}
