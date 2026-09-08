/**
 * Deterministic source-text alignment for extraction confidence — the same
 * verbatim-presence check langextract uses before fuzzy alignment. Measures
 * "is this extracted value present in the OCR text?", not OCR ink confidence.
 */

/** How well the text an extraction claims to have read matches the document. */
export type SourceAlignmentStatus = 'match_exact' | 'match_fuzzy' | 'ungrounded';

export type SourceAlignmentResult = {
  status: SourceAlignmentStatus;
  score: number;
};

const EXACT_SCORE = 0.94;

export const ALIGNMENT_SCORE: Record<SourceAlignmentStatus, number> = {
  match_exact: EXACT_SCORE,
  match_fuzzy: 0.72,
  ungrounded: 0.35,
};

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s,$£€]/g, '')
    .replace(/\.0+$/, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findBoundaryMatch(value: string, text: string): number {
  try {
    const re = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(value)}(?![A-Za-z0-9])`, 'i');
    const match = re.exec(text);
    return match ? match.index : -1;
  } catch {
    return -1;
  }
}

function tokenCoverageAlignment(value: string, text: string): SourceAlignmentResult | undefined {
  const tokens = value
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  if (tokens.length === 0) return undefined;

  const lowerText = text.toLowerCase();
  let cursor = 0;
  let matched = 0;
  for (const token of tokens) {
    const index = lowerText.indexOf(token.toLowerCase(), cursor);
    if (index < 0) continue;
    matched += 1;
    cursor = index + token.length;
  }

  if (matched === 0) return undefined;
  const ratio = matched / tokens.length;
  if (ratio >= 0.85) {
    return { status: 'match_exact', score: ALIGNMENT_SCORE.match_exact * ratio };
  }
  if (ratio >= 0.5) {
    return { status: 'match_fuzzy', score: ALIGNMENT_SCORE.match_fuzzy * ratio };
  }
  return { status: 'ungrounded', score: ALIGNMENT_SCORE.ungrounded };
}

/**
 * Align an extracted scalar against plain document text (no LLM round-trip).
 */
export function alignValueToSourceText(
  value: unknown,
  documentText: string
): SourceAlignmentResult {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return { status: 'ungrounded', score: ALIGNMENT_SCORE.ungrounded };
  }
  if (typeof value === 'object') {
    return { status: 'ungrounded', score: ALIGNMENT_SCORE.ungrounded };
  }

  const raw = String(value).trim();
  if (!raw || !documentText.trim()) {
    return { status: 'ungrounded', score: ALIGNMENT_SCORE.ungrounded };
  }

  const exactIndex = findBoundaryMatch(raw, documentText);
  if (exactIndex >= 0) {
    const status: SourceAlignmentStatus = raw.length >= 3 ? 'match_exact' : 'match_fuzzy';
    return { status, score: ALIGNMENT_SCORE[status] };
  }

  const normalized = normalizeForMatch(raw);
  if (normalized.length >= 3 && normalizeForMatch(documentText).includes(normalized)) {
    return { status: 'match_fuzzy', score: ALIGNMENT_SCORE.match_fuzzy };
  }

  const tokenCoverage = tokenCoverageAlignment(raw, documentText);
  if (tokenCoverage) return tokenCoverage;

  return { status: 'ungrounded', score: ALIGNMENT_SCORE.ungrounded };
}

function bestAlignment(results: SourceAlignmentResult[]): SourceAlignmentResult {
  return results.reduce<SourceAlignmentResult>(
    (best, candidate) => (candidate.score > best.score ? candidate : best),
    { status: 'ungrounded', score: ALIGNMENT_SCORE.ungrounded }
  );
}

/**
 * Resolve one leaf against the regions it cites, falling back to the rest of the
 * document and to the model's supporting quote.
 *
 * A returned quote means the value is a rewrite of text that was read verbatim,
 * and `status`/`score` then describe *that text* — the only claim alignment can
 * check. The quote is absent when the value stands on its own and absent when the
 * quote could not be found, because an unverifiable quote dresses up a
 * hallucination as evidence.
 *
 * Order matters more than it looks.
 *
 * A value read verbatim is judged on itself; no quote can make that a rewrite.
 * Past that, a value the model reformatted (`1234.5` read from `$1,234.50`, or
 * `2024-05-30` from `MAY 30, 2024`) may share enough of its source to align
 * loosely, or almost none of it. Either way the honest claim is the same: we
 * verified the quote, and the returned value came from it. Deciding that on
 * "the value failed to align" would call the first case a direct read.
 *
 * A short value or quote can also turn up verbatim *somewhere else* in the
 * document — an ISO date matching an unrelated ISO date elsewhere. Scoring that
 * as an exact match would claim the field is grounded in a passage it was never
 * read from, so the cited regions are asked first: a value found outside them is
 * worth no more than a fuzzy match, and a quote found outside them grounds
 * nothing at all, because a read is attributed to the regions it names. With no
 * citations the document is all the evidence there is, so it carries its own
 * verdict.
 */
export function alignFieldToSourceTexts(input: {
  value: unknown;
  quote?: string;
  /** Text of the regions the model cited for this field, if it cited any. */
  citedTexts: readonly string[];
  /** The whole document, for fields with no citations to be judged against. */
  documentText: string;
}): SourceAlignmentResult & { quote?: string } {
  const cited = input.citedTexts.filter((text) => text.trim().length > 0);
  const rest = input.documentText.trim().length > 0 ? [input.documentText] : [];
  const quote = input.quote?.trim();

  const inCited = bestAlignment(cited.map((text) => alignValueToSourceText(input.value, text)));
  if (inCited.status === 'match_exact') return inCited;

  // Only verbatim presence counts. A quote that merely aligns fuzzily is not the
  // span it claims to be, so it earns nothing over an absent quote. Nothing was
  // read into an absent value either, whatever the model quoted.
  const valueText = stringifyValue(input.value);
  const rewrite =
    quote && valueText !== undefined && valueText !== '' && quote !== valueText ? quote : undefined;
  if (rewrite) {
    // A read is attributed to the regions the field cites, so the quote has to be
    // in them. Accepting one from elsewhere would attach verified text to a
    // passage that does not contain it, whatever score came with it.
    const searched = cited.length > 0 ? cited : rest;
    const found = bestAlignment(searched.map((text) => alignValueToSourceText(rewrite, text)));
    if (found.status === 'match_exact') return { ...found, quote: rewrite };
  }

  if (inCited.status !== 'ungrounded') return inCited;

  const inDocument = bestAlignment(rest.map((text) => alignValueToSourceText(input.value, text)));
  if (inDocument.status !== 'ungrounded') {
    if (cited.length === 0) return inDocument;
    return {
      status: 'match_fuzzy',
      score: Math.min(inDocument.score, ALIGNMENT_SCORE.match_fuzzy),
    };
  }

  return { status: 'ungrounded', score: ALIGNMENT_SCORE.ungrounded };
}

function stringifyValue(value: unknown): string | undefined {
  if (value === null || value === undefined || typeof value === 'object') return undefined;
  return String(value).trim();
}

const XML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
};

/**
 * Recover the document text from the tagged source listing the model was shown.
 *
 * Tags come off, and so do the entities that were escaped to build them: a value
 * containing an apostrophe or ampersand is compared against the raw document
 * elsewhere, and `O&apos;Brien` matches nothing.
 */
export function documentPlainText(documentText: string): string {
  return documentText
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (entity) => XML_ENTITIES[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();
}
