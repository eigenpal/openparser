/**
 * How a value's recognition score is derived from the OCR words behind it.
 *
 * This is a profile rule, not part of `lineage@1`: the protocol says a score has
 * a scale, a scope, and a named method, and stays silent on what any particular
 * method computes. It ships beside the protocol because a producer and a consumer
 * that disagree here disagree about what a number means. A region cited by two
 * fields is read once but quoted differently by each, so scoring the region and
 * scoring a value are different questions — and answering the second with the
 * first is how a crisply scanned number ends up wearing its neighbor's bad
 * handwriting.
 */

/** An OCR token with its recognition score, and whether a value was read from it. */
export type ScoredWord = {
  id?: string;
  text: string;
  confidence: number;
  cited?: boolean;
};

export const CITED_RECOGNITION_METHOD = 'cited_minimum_context_downblend';

/** Scoring a whole region, because no word within it could be narrowed to. */
export const REGION_RECOGNITION_METHOD = 'region_word_minimum';

/** How far the surrounding text may pull a cited score down. */
export const CONTEXT_BLEND_WEIGHT = 0.15;

/**
 * Blend a cited-word minimum with the surrounding context: weaker context may
 * only pull the score down, and never below what the blend allows. A noisy
 * neighborhood is evidence that a value might be misread, not a verdict that it
 * was.
 */
export function downwardBlendCitedMinimum(
  citedMin: number,
  contextMean: number | undefined
): number {
  if (contextMean === undefined) return citedMin;
  const blended = citedMin * (1 - CONTEXT_BLEND_WEIGHT) + contextMean * CONTEXT_BLEND_WEIGHT;
  return Math.min(citedMin, blended);
}

export type CitedWordAggregate = {
  score: number;
  minimum: number;
  maximum: number;
  sampleCount: number;
  method: typeof CITED_RECOGNITION_METHOD | typeof REGION_RECOGNITION_METHOD;
  contextMean?: number;
  contextSampleCount?: number;
};

/**
 * Score one value from the words it was read from, discounted by the words
 * around it. With nothing marked cited there is nothing to narrow to, so every
 * word counts, the result is the region's own weakest token, and `method` says
 * so — a score over the whole region must not claim to have narrowed to a value.
 */
export function aggregateCitedWordConfidences(
  words: readonly ScoredWord[]
): CitedWordAggregate | undefined {
  if (words.length === 0) return undefined;
  const cited = words.filter((word) => word.cited !== false);
  const context = words.filter((word) => word.cited === false);
  const active = cited.length > 0 ? cited : words;
  const activeScores = active.map((word) => word.confidence);
  const contextMean =
    cited.length > 0 && context.length > 0
      ? context.reduce((sum, word) => sum + word.confidence, 0) / context.length
      : undefined;
  const citedMin = Math.min(...activeScores);

  return {
    score: downwardBlendCitedMinimum(citedMin, contextMean),
    minimum: citedMin,
    maximum: Math.max(...activeScores),
    sampleCount: active.length,
    method: cited.length > 0 ? CITED_RECOGNITION_METHOD : REGION_RECOGNITION_METHOD,
    ...(contextMean !== undefined ? { contextMean, contextSampleCount: context.length } : {}),
  };
}

/** First candidate found in the text wins; pass candidates in priority order. */
export function citedSpanInText(
  regionText: string,
  candidates: ReadonlyArray<string | undefined>
): { start: number; end: number } {
  if (!regionText) return { start: -1, end: -1 };
  for (const candidate of candidates) {
    const quote = candidate?.trim();
    if (!quote) continue;
    let start = regionText.indexOf(quote);
    if (start < 0) start = regionText.toLowerCase().indexOf(quote.toLowerCase());
    if (start >= 0) return { start, end: start + quote.length };
  }
  return { start: -1, end: -1 };
}

function wordOverlapsSpan(
  regionText: string,
  word: ScoredWord,
  cursor: number,
  span: { start: number; end: number }
): { overlaps: boolean; nextCursor: number } {
  if (!word.text) return { overlaps: false, nextCursor: cursor };
  const at = regionText.indexOf(word.text, cursor);
  if (at < 0) return { overlaps: false, nextCursor: cursor };
  const wordEnd = at + word.text.length;
  return {
    overlaps: span.start >= 0 && at < span.end && wordEnd > span.start,
    nextCursor: wordEnd,
  };
}

/**
 * Mark the words a value was read from within a region.
 *
 * `extractedText` is what the extraction produced, which is always text present
 * in the document: for a value returned as-is it is the value itself, and for one
 * the model went on to rewrite — `2024-05-30` from `MAY 30, 2024` — it is the text
 * that was actually read. Searching for the value instead would find nothing in
 * the second case. `lineageWordTexts`/`lineageWordIds` name words a lineage
 * document already attributes to the value, used when no span matches.
 */
export function annotateWordsWithCitation<T extends ScoredWord>(
  regionText: string,
  words: readonly T[],
  options?: {
    extractedText?: string;
    lineageWordTexts?: ReadonlySet<string>;
    lineageWordIds?: ReadonlySet<string>;
  }
): Array<T & { cited: boolean }> {
  const span = citedSpanInText(regionText, [options?.extractedText]);
  const hasQuoteSpan = span.start >= 0;
  let cursor = 0;

  return words.map((word) => {
    const { overlaps, nextCursor } = wordOverlapsSpan(regionText, word, cursor, span);
    cursor = nextCursor;
    const inLineage = Boolean(
      (word.id && options?.lineageWordIds?.has(word.id)) ||
      options?.lineageWordTexts?.has(word.text)
    );
    return { ...word, cited: hasQuoteSpan ? overlaps : inLineage };
  });
}
