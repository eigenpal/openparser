/**
 * Flatten only OCR LaTeX artifacts that have an unambiguous text equivalent.
 * Variables and structured formulas remain intact for downstream rendering.
 */
const SYMBOLS: Record<string, string> = {
  S: '§',
  P: '¶',
  dag: '†',
  ddag: '‡',
  ast: '*',
  textasteriskcentered: '*',
  times: '×',
  pm: '±',
  circ: '°',
  deg: '°',
};

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
};

const SUBSCRIPT: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
};

function unwrap(body: string): string {
  let out = body.trim();
  while (out.startsWith('{') && out.endsWith('}')) out = out.slice(1, -1).trim();
  return out;
}

function flatten(inner: string): string | null {
  const body = inner.trim();
  const macro = body.match(/^\\([A-Za-z]+|[%$&#_])$/);
  if (macro?.[1]) return SYMBOLS[macro[1]] ?? null;

  const script = body.match(/^([_^])(.+)$/);
  if (!script) return null;
  const token = unwrap(script[2] ?? '');
  if (script[1] === '^') {
    // Exact nested-brace form emitted by Paddle for the OCR asterisk artifact.
    if (/^\{\{\s*\*\s*\}\}$/.test(script[2] ?? '')) return '*';
    return SUPERSCRIPT[token] ?? null;
  }
  return SUBSCRIPT[token] ?? null;
}

/**
 * Rewrite safe `$…$` artifacts with deterministic spacing.
 * Symbols retain natural word spacing; scripts bind to preceding text.
 */
export function simplifyLatex(text: string): string {
  if (!text.includes('$')) return text;

  return text.replace(
    /([ \t]*)\$([^$\n]{1,40}?)\$([ \t]*)/g,
    (whole, before: string, inner: string, after: string) => {
      const plain = flatten(inner);
      if (plain === null) return whole;
      const body = inner.trim();
      const isScript = body.startsWith('^') || body.startsWith('_');
      const leading = isScript ? '' : before ? ' ' : '';
      const trailing = after ? ' ' : '';
      return `${leading}${plain}${trailing}`;
    }
  );
}

function simplifyVisibleText(input: string, protectMarkdownDestinations: boolean): string {
  let output = '';
  let textStart = 0;
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    const startsMarkup =
      char === '<' &&
      (input.startsWith('<!--', index) || /[A-Za-z!/?]/.test(input[index + 1] ?? ''));

    if (startsMarkup) {
      output += simplifyLatex(input.slice(textStart, index));
      const markupStart = index;
      if (input.startsWith('<!--', index)) {
        const commentEnd = input.indexOf('-->', index + 4);
        index = commentEnd === -1 ? input.length : commentEnd + 3;
        output += input.slice(markupStart, index);
        textStart = index;
        continue;
      }

      let quote: '"' | "'" | undefined;
      index++;
      while (index < input.length) {
        const markupChar = input[index];
        if (quote) {
          if (markupChar === quote) quote = undefined;
        } else if (markupChar === '"' || markupChar === "'") {
          quote = markupChar;
        } else if (markupChar === '>') {
          index++;
          break;
        }
        index++;
      }
      output += input.slice(markupStart, index);
      textStart = index;
      continue;
    }

    if (protectMarkdownDestinations && char === ']') {
      let open = index + 1;
      while (input[open] === ' ' || input[open] === '\t') open++;
      if (input[open] === '(') {
        let depth = 1;
        let destinationIndex = open + 1;
        while (destinationIndex < input.length && depth > 0) {
          const destinationChar = input[destinationIndex];
          if (destinationChar === '\\') {
            destinationIndex += 2;
            continue;
          }
          if (destinationChar === '(') depth++;
          else if (destinationChar === ')') depth--;
          destinationIndex++;
        }
        if (depth === 0) {
          output += simplifyLatex(input.slice(textStart, open + 1));
          output += input.slice(open + 1, destinationIndex);
          index = destinationIndex;
          textStart = index;
          continue;
        }
      }
    }

    index++;
  }

  output += simplifyLatex(input.slice(textStart));
  return output;
}

/**
 * Rewrite table text nodes only. Tags, attributes, URLs, comments, and quoted
 * `>` characters are copied byte-for-byte.
 */
export function simplifyTableHtml(html: string): string {
  if (!html.startsWith('<')) return html;
  return simplifyVisibleText(html, false);
}

/**
 * Rewrite visible provider-markdown text while preserving embedded HTML markup
 * and Markdown link/image destinations.
 */
export function simplifyMarkdownArtifacts(markdown: string): string {
  return simplifyVisibleText(markdown, true);
}
