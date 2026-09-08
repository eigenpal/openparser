import type { ExtractionRepairFeedback } from './run-types';

/** Canonical ungrounded extraction instruction. Hosts must not rewrite this. */
export const EXTRACT_PROMPT = `Extract the requested schema from the parsed document text below.
Return only JSON that matches the schema.
Copy each value exactly as it appears in the document — word for word, preserving wording, spelling, casing, and punctuation.
Do not normalize dates, addresses, names, or phrasing into any canonical form.
The schema's declared type and any format in a field description still win: integer and number fields are JSON numbers ("4 year(s)" becomes 4).`;

/** Canonical field-grounded extraction instruction. Hosts must not rewrite this. */
export const GROUNDED_EXTRACT_PROMPT = `Extract the requested schema from the source-tagged document below.
Each <element id="…"> is a citeable source.
Copy each value exactly as it appears in the document — word for word, preserving wording, spelling, casing, and punctuation.
Do not normalize dates, addresses, names, or phrasing into any canonical form.
The schema's declared type and any format in a field description still win: integer and number fields are JSON numbers ("4 year(s)" becomes 4).
Return JSON with:
- values: the extracted object matching the caller schema exactly
- fields: an array of { path, source_ids, reason, quote, transform_claim } entries — exactly one per leaf in values
Paths use dotted segments and 0-based array indices (e.g. line_items.0.amount).
Cite exact element ids (or table cell ids) in source_ids. Never invent coordinates.
Each quote is the exact span of document text the value came from, copied character for character — same wording, spelling, casing, punctuation, and digits. Never paraphrase a quote, never stitch one together from separate places, and never quote text that is not in the document.
Always give a quote, including when the value already matches the document word for word. Use an empty string only when the value is genuinely absent from the document.
Reading text off the page and converting it are two separate claims, so explain them separately.
Each reason is one or two sentences on why that quote is the source: what in the document identifies it. Never explain formatting in a reason.
Each transform_claim reports a rewrite separately from the verbatim read. Set operation to the closest bounded operation, fill only applicable parameter strings (all others are empty), explain the conversion in reason, and report low, medium, or high coarse confidence. For a verbatim value, use an empty operation, a parameters object whose strings are all empty, an empty reason, and empty confidence.
Your transform claim is only an untrusted report. The service independently decides whether trusted request intent permits a deterministic verifier and recomputes the output.`;

/** Append optional caller instructions after the canonical extraction prompt. */
export function appendExtractionCallerPrompt(canonical: string, callerPrompt?: string): string {
  const extra = callerPrompt?.trim();
  return extra ? `${canonical}\n\n${extra}` : canonical;
}

/** Trusted SCHEMA REPAIR block. Hosts must not mix this into untrusted document content. */
export function formatExtractionRepairFeedback(feedback: ExtractionRepairFeedback): string {
  return `SCHEMA REPAIR:\nINVALID JSON: ${JSON.stringify(feedback.invalidJson)}\nERRORS: ${JSON.stringify(feedback.errors)}`;
}

/**
 * Trusted instruction layer: canonical/caller prompt plus optional repair.
 * Eigenpal sends this as `extractStructuredOnce` options.prompt.
 */
export function composeExtractionInstruction(input: {
  prompt: string;
  repairFeedback: ExtractionRepairFeedback | null;
}): string {
  if (!input.repairFeedback) return input.prompt;
  return `${input.prompt}\n\n${formatExtractionRepairFeedback(input.repairFeedback)}`;
}

/**
 * Single user-message body: canonical prompt + document + optional repair.
 * Provider HTTP wrappers send this as the user content.
 */
export function composeExtractionUserMessage(input: {
  prompt: string;
  documentText: string;
  repairFeedback: ExtractionRepairFeedback | null;
}): string {
  let message = `${input.prompt}\n\nDOCUMENT:\n${input.documentText}`;
  if (input.repairFeedback) {
    message += `\n\n${formatExtractionRepairFeedback(input.repairFeedback)}`;
  }
  return message;
}
