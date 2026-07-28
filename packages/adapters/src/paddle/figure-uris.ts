import { PaddleAdapterError } from './errors';

/** Figure-crop persistence mode used when rewriting URIs into canonical output. */
export type FigureAssetsMode = 'none' | 'stored';

export type FigureAssetUriMap = ReadonlyMap<string, string>;

/** Host policy for acceptable public figure URIs when `figureAssets` is `stored`. */
export type FigureUriValidator = (uri: string) => boolean;

export function rewriteMarkdownFigureUris(
  markdown: string | undefined,
  uriMap: FigureAssetUriMap
): string | undefined {
  if (!markdown || uriMap.size === 0) return markdown;
  let out = markdown;
  for (const [providerPath, publicUri] of uriMap) {
    const escaped = providerPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(["'])${escaped}\\1`, 'g'), `"${publicUri}"`);
    out = out.replace(new RegExp(`\\]\\(${escaped}\\)`, 'g'), `](${publicUri})`);
  }
  if (out.includes('data:image')) {
    out = out.replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, '');
  }
  return out;
}

export function canonicalizeMarkdownFigureUris(input: {
  markdown: string | undefined;
  figureAssets: FigureAssetsMode;
  uriMap: FigureAssetUriMap;
  /** When set, every markdown image reference must satisfy this predicate after rewriting. */
  isPublicFigureUri?: FigureUriValidator;
}): string | undefined {
  if (!input.markdown) return input.markdown;
  if (input.figureAssets === 'none') {
    return stripMarkdownImages(input.markdown);
  }

  const rewritten = rewriteMarkdownFigureUris(input.markdown, input.uriMap) ?? input.markdown;
  if (!input.isPublicFigureUri) return rewritten;

  const references = markdownImageReferences(rewritten);
  const unresolved = references.find((reference) => !input.isPublicFigureUri!(reference));
  if (unresolved) {
    throw new PaddleAdapterError(
      `figure_assets=stored could not map markdown image reference ${unresolved}`,
      false
    );
  }
  return rewritten;
}

export function assertPublicFigureUri(input: {
  uri: string;
  isPublicFigureUri?: FigureUriValidator;
  failureMessage: string;
}): void {
  if (!input.isPublicFigureUri || input.isPublicFigureUri(input.uri)) return;
  throw new PaddleAdapterError(input.failureMessage, false);
}

export function resolveFigureBlockUri(input: {
  blockContent: string;
  figureAssets: FigureAssetsMode;
  uriMap: FigureAssetUriMap;
}): string | null {
  const content = input.blockContent.trim();
  if (input.figureAssets !== 'stored') return null;
  if (/^(?:https?:|data:)/i.test(content)) return null;
  const direct = input.uriMap.get(content) ?? input.uriMap.get(content.replace(/^\.\//, ''));
  if (direct) return direct;
  const base = content.split('/').pop();
  if (base) {
    const mapped = input.uriMap.get(base);
    if (mapped) return mapped;
  }
  const match = content.match(/src\s*=\s*["']([^"']+)["']/i);
  if (match?.[1]) {
    const src = match[1];
    return input.uriMap.get(src) ?? input.uriMap.get(src.split('/').pop() ?? '') ?? null;
  }
  return null;
}

function stripMarkdownImages(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, '');
}

function markdownImageReferences(markdown: string): string[] {
  const references: string[] = [];
  for (const match of markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
    if (match[1]) references.push(match[1]);
  }
  for (const match of markdown.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    if (match[1]) references.push(match[1]);
  }
  return references;
}
