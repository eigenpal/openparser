import type { ExtractionGroundingResult } from './grounding';
import {
  GroundingUnsupportedSchemaError,
  providerSafeExtractionSchema,
  relaxGroundingNarrative,
  transformSchemaForGrounding,
} from './grounding/schema-transform';
import { renderGroundedDocument } from './grounding/sources';
import { buildGroundingResult, unwrapGroundedOutput } from './grounding/unground';
import {
  appendExtractionCallerPrompt,
  composeExtractionUserMessage,
  EXTRACT_PROMPT,
  GROUNDED_EXTRACT_PROMPT,
} from './prompts';
import {
  ExtractionSchemaFailure,
  MAX_EXTRACTION_REPAIR_ATTEMPTS,
  structuredExtractionFailureFromUnknown,
  type ExtractionAttemptKind,
  type ExtractionAttemptOutcome,
  type ExtractionRepairFeedback,
  type GroundedExtractionInput,
  type GroundedExtractionResult,
} from './run-types';
import { normalizeStrictExtractionSchema, StrictExtractionSchemaError } from './strict-schema';
import { validateOutput, validateParsedValue } from './validate';

export {
  ExtractionSchemaFailure,
  MAX_EXTRACTION_REPAIR_ATTEMPTS,
  structuredExtractionFailureFromUnknown,
} from './run-types';

/**
 * True when field-grounded extraction can admit this caller schema.
 * Matches `runGroundedExtraction` prep: strict normalize, then grounding transform.
 * Open maps and non-object roots return false; missing `additionalProperties: false`
 * is coerced and therefore supported.
 */
export function isGroundedExtractionSchemaSupported(schema: Record<string, unknown>): boolean {
  try {
    transformSchemaForGrounding(normalizeStrictExtractionSchema(schema));
    return true;
  } catch (error) {
    if (
      error instanceof StrictExtractionSchemaError ||
      error instanceof GroundingUnsupportedSchemaError
    ) {
      return false;
    }
    throw error;
  }
}

export type {
  CompleteStructuredExtraction,
  ExtractionAttemptKind,
  ExtractionAttemptOutcome,
  ExtractionAttemptStatus,
  ExtractionRepairError,
  ExtractionRepairFeedback,
  ExtractionRunHooks,
  ExtractionValidationResult,
  GroundedExtractionInput,
  GroundedExtractionResult,
  StructuredExtractionCompletion,
  StructuredExtractionFailure,
  StructuredExtractionRequest,
} from './run-types';

/**
 * Provider-neutral grounded extraction: schema prep, prompts, repair loop,
 * parse/validate, unwrap, and citation assembly.
 *
 * Hosts inject `complete` for one structured-output attempt and optional
 * fencing hooks. Invalid caller schemas throw `StrictExtractionSchemaError`
 * before any completion. Exhausted schema repair throws `ExtractionSchemaFailure`.
 */
export async function runGroundedExtraction(
  input: GroundedExtractionInput
): Promise<GroundedExtractionResult> {
  const repairBound = Math.min(Math.max(input.repairAttempts, 0), MAX_EXTRACTION_REPAIR_ATTEMPTS);
  const maxAttempts = 1 + repairBound;
  const attempts: ExtractionAttemptOutcome[] = [];
  const grounded = input.grounding === 'field';
  const hooks = input.hooks ?? {};

  let callerSchema: Record<string, unknown>;
  try {
    callerSchema = normalizeStrictExtractionSchema(input.schema);
  } catch (error) {
    if (error instanceof StrictExtractionSchemaError) throw error;
    const reason = error instanceof Error ? error.message : 'invalid extraction schema';
    throw new StrictExtractionSchemaError(reason);
  }

  const modelSchema = grounded
    ? transformSchemaForGrounding(callerSchema)
    : providerSafeExtractionSchema(callerSchema);
  const responseSchema = grounded ? relaxGroundingNarrative(modelSchema) : modelSchema;
  const documentText = grounded
    ? renderGroundedDocument(input.parsedDocument)
    : input.parsedDocument.markdown;
  const prompt = appendExtractionCallerPrompt(
    grounded ? GROUNDED_EXTRACT_PROMPT : EXTRACT_PROMPT,
    input.prompt
  );
  let repairFeedback: ExtractionRepairFeedback | null = null;

  for (let index = 0; index < maxAttempts; index++) {
    const kind: ExtractionAttemptKind = index === 0 ? 'primary' : 'repair';
    hooks.requireLease?.();
    await hooks.beforeDispatch?.({ attemptIndex: index, kind });

    let raw: {
      content: string;
      inputTokens?: number | null;
      outputTokens?: number | null;
      costUsd?: number | null;
    };
    try {
      raw = await input.complete({
        attemptIndex: index,
        kind,
        schema: modelSchema,
        prompt,
        documentText,
        repairFeedback,
        userMessage: composeExtractionUserMessage({ prompt, documentText, repairFeedback }),
      });
    } catch (error) {
      hooks.requireLease?.();
      const failure = structuredExtractionFailureFromUnknown(error);
      if (failure) {
        const attempt: ExtractionAttemptOutcome = {
          attemptIndex: index,
          kind,
          status: failure.extractionAttemptStatus,
          inputTokens: failure.inputTokens,
          outputTokens: failure.outputTokens,
          costUsd: failure.costUsd,
          error: failure.message,
          providerError: failure.providerError ?? null,
        };
        attempts.push(attempt);
        await hooks.afterAttempt?.(attempt);
      }
      throw error;
    }

    const modelValidation = validateOutput(raw.content, responseSchema);
    let acceptedOutput: Record<string, unknown> | null = null;
    let grounding: ExtractionGroundingResult | undefined;
    let validationErrors = modelValidation.validationErrors;
    let schemaError = modelValidation.schemaError;

    if (!schemaError && modelValidation.data) {
      if (grounded) {
        const { output, pending } = unwrapGroundedOutput(modelValidation.data);
        if (!output || typeof output !== 'object' || Array.isArray(output)) {
          schemaError = new TypeError('grounded extraction output must be a JSON object');
          validationErrors = [
            {
              path: '/',
              kind: 'type',
              message: 'grounded extraction output must be a JSON object',
            },
          ];
        } else {
          const originalValidation = validateParsedValue(output, callerSchema);
          if (originalValidation.schemaError) {
            schemaError = originalValidation.schemaError;
            validationErrors = originalValidation.validationErrors;
          } else {
            acceptedOutput = output as Record<string, unknown>;
            grounding = buildGroundingResult(pending, input.parsedDocument);
          }
        }
      } else {
        acceptedOutput = modelValidation.data;
      }
    }

    if (!schemaError && acceptedOutput) {
      const attempt: ExtractionAttemptOutcome = {
        attemptIndex: index,
        kind,
        status: 'succeeded',
        inputTokens: raw.inputTokens,
        outputTokens: raw.outputTokens,
        costUsd: raw.costUsd,
      };
      attempts.push(attempt);
      await hooks.afterAttempt?.(attempt);
      return { output: acceptedOutput, attempts, ...(grounding ? { grounding } : {}) };
    }

    const attempt: ExtractionAttemptOutcome = {
      attemptIndex: index,
      kind,
      status: 'failed',
      inputTokens: raw.inputTokens,
      outputTokens: raw.outputTokens,
      costUsd: raw.costUsd,
      error: 'schema validation failed',
    };
    attempts.push(attempt);
    await hooks.afterAttempt?.(attempt);

    if (index >= maxAttempts - 1) {
      throw new ExtractionSchemaFailure();
    }
    repairFeedback = {
      invalidJson: modelValidation.data,
      errors: validationErrors,
    };
  }
  throw new ExtractionSchemaFailure('extraction exhausted repair attempts');
}
