import { z } from 'zod';
import { AzureDiError } from './errors';

/**
 * Public Azure Document Intelligence parse options for OpenParser cloud clients.
 * Omitted / false feature flags preserve today's request shape (no `features` query).
 */
const AzureCommonOptionsShape = {
  high_resolution_ocr: z.boolean().optional(),
  formulas: z.boolean().optional(),
  font_styles: z.boolean().optional(),
  barcodes: z.boolean().optional(),
  languages: z.boolean().optional(),
  /** Locale hint (`en` or BCP-47 `en-US`). Omitted / null = Azure auto. */
  locale: z.string().trim().min(2).max(35).nullable().optional(),
  /** 1-based page ranges (`1-3,5`). Omitted / null = all pages. */
  pages: z
    .string()
    .trim()
    .regex(/^\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*$/)
    .max(128)
    .nullable()
    .optional(),
} as const;

/**
 * Options accepted by Azure `prebuilt-read` (and similar text models).
 * `key_value_pairs` is a Layout-model feature and is rejected here.
 */
export const AzureDiReadParseOptionsSchema = z.object(AzureCommonOptionsShape).strict();

/**
 * Options accepted by Azure `prebuilt-layout` (and similar layout models),
 * including `key_value_pairs`.
 */
export const AzureDiLayoutParseOptionsSchema = z
  .object({
    ...AzureCommonOptionsShape,
    /** Supported by Azure's prebuilt-layout model, not prebuilt-read. */
    key_value_pairs: z.boolean().optional(),
  })
  .strict();

/** Full Layout options schema (preferred alias). */
export const AzureParseOptionsSchema = AzureDiLayoutParseOptionsSchema;

export type AzureParseOptions = z.infer<typeof AzureDiLayoutParseOptionsSchema>;
export type AzureDiReadParseOptions = z.infer<typeof AzureDiReadParseOptionsSchema>;

/** REST `features` values for API 2024-11-30, in stable emission order. */
export const AZURE_DI_FEATURE_PARAM_BY_OPTION = {
  high_resolution_ocr: 'ocrHighResolution',
  formulas: 'formulas',
  font_styles: 'styleFont',
  barcodes: 'barcodes',
  languages: 'languages',
  key_value_pairs: 'keyValuePairs',
} as const satisfies Record<Exclude<keyof AzureParseOptions, 'locale' | 'pages'>, string>;

const FEATURE_OPTION_KEYS = [
  'high_resolution_ocr',
  'formulas',
  'font_styles',
  'barcodes',
  'languages',
  'key_value_pairs',
] as const;

/** Azure `pages` query: `^(\d+(-\d+)?)(,\s*(\d+(-\d+)?))*$` — enforced conservatively. */
const PAGES_QUERY_PATTERN = /^(\d+(-\d+)?)(,\s*(\d+(-\d+)?))*$/;

/** Language code or short BCP-47 tag (e.g. `en`, `en-US`, `zh-Hans`). */
const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/;

const MAX_LOCALE_CHARS = 35;
const MAX_PAGES_CHARS = 128;

export type ResolvedAzureDiAnalyzeParams = {
  /** Comma-separated REST feature list, or undefined when none enabled. */
  features?: string;
  locale?: string;
  pages?: string;
  /** Page count the converter must observe (full doc, or selected subset). */
  expectedPageCount: number;
};

/**
 * Real provider fact: `keyValuePairs` analyze feature is supported on Layout,
 * not on the Read model.
 */
export function azureModelSupportsKeyValuePairs(modelId: string): boolean {
  const id = modelId.trim().toLowerCase();
  return id === 'prebuilt-layout' || id.startsWith('prebuilt-layout');
}

export function azureDiOptionsSchemaForModel(
  modelId: string
): typeof AzureDiLayoutParseOptionsSchema | typeof AzureDiReadParseOptionsSchema {
  return azureModelSupportsKeyValuePairs(modelId)
    ? AzureDiLayoutParseOptionsSchema
    : AzureDiReadParseOptionsSchema;
}

export function parseAzureDiParseOptions(
  modelId: string,
  options: unknown
): AzureParseOptions | AzureDiReadParseOptions {
  const schema = azureDiOptionsSchemaForModel(modelId);
  const parsed = schema.safeParse(options ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new AzureDiError(
      issue
        ? `Azure Document Intelligence option invalid: ${issue.path.join('.') || '(root)'} ${issue.message}`
        : 'Azure Document Intelligence options are invalid',
      false
    );
  }
  return parsed.data;
}

function validateLocale(locale: string): string {
  if (locale !== locale.trim() || locale.length === 0) {
    throw new AzureDiError(
      'Azure Document Intelligence locale must be a non-empty trimmed language tag',
      false
    );
  }
  if (locale.length > MAX_LOCALE_CHARS || !LOCALE_PATTERN.test(locale)) {
    throw new AzureDiError(
      `Azure Document Intelligence locale is invalid: ${locale.slice(0, 64)}`,
      false
    );
  }
  return locale;
}

function parsePagesSelection(pages: string, documentPageCount: number): number {
  if (pages !== pages.trim() || pages.length === 0) {
    throw new AzureDiError(
      'Azure Document Intelligence pages must be a non-empty trimmed page range string',
      false
    );
  }
  if (pages.length > MAX_PAGES_CHARS || !PAGES_QUERY_PATTERN.test(pages)) {
    throw new AzureDiError(
      `Azure Document Intelligence pages is invalid: ${pages.slice(0, 64)}`,
      false
    );
  }
  if (!Number.isInteger(documentPageCount) || documentPageCount < 1) {
    throw new AzureDiError(
      `Azure Document Intelligence document page count is invalid: ${documentPageCount}`,
      false
    );
  }

  const selected = new Set<number>();
  for (const segment of pages.split(',')) {
    const part = segment.trim();
    const range = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!range) {
      throw new AzureDiError(
        `Azure Document Intelligence pages is invalid: ${pages.slice(0, 64)}`,
        false
      );
    }
    const start = Number(range[1]);
    const end = range[2] === undefined ? start : Number(range[2]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) {
      throw new AzureDiError(`Azure Document Intelligence pages range is invalid: ${part}`, false);
    }
    if (end > documentPageCount) {
      throw new AzureDiError(
        `Azure Document Intelligence pages ${part} exceeds document page count ${documentPageCount}`,
        false
      );
    }
    for (let page = start; page <= end; page += 1) {
      selected.add(page);
    }
  }

  if (selected.size === 0) {
    throw new AzureDiError('Azure Document Intelligence pages selected no pages', false);
  }
  return selected.size;
}

/**
 * Validate public options and resolve REST analyze query parameters.
 * Omitted options leave features/locale/pages unset (current default behavior).
 * Pass `modelId` when available so Layout-only features are rejected on Read.
 */
export function resolveAzureDiAnalyzeParams(input: {
  documentPageCount: number;
  options?: AzureParseOptions;
  modelId?: string;
}): ResolvedAzureDiAnalyzeParams {
  const options = input.options;
  if (!options) {
    return { expectedPageCount: input.documentPageCount };
  }

  const validated = (() => {
    if (input.modelId) {
      return parseAzureDiParseOptions(input.modelId, options);
    }
    const parsed = AzureDiLayoutParseOptionsSchema.safeParse(options);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AzureDiError(
        issue
          ? `Azure Document Intelligence option invalid: ${issue.path.join('.') || '(root)'} ${issue.message}`
          : 'Azure Document Intelligence options are invalid',
        false
      );
    }
    return parsed.data;
  })();

  const features: string[] = [];
  for (const key of FEATURE_OPTION_KEYS) {
    if (key === 'key_value_pairs' && !('key_value_pairs' in validated)) continue;
    if (validated[key as keyof typeof validated] === true) {
      features.push(AZURE_DI_FEATURE_PARAM_BY_OPTION[key]);
    }
  }

  let expectedPageCount = input.documentPageCount;
  let pages: string | undefined;
  if (validated.pages != null) {
    expectedPageCount = parsePagesSelection(validated.pages, input.documentPageCount);
    pages = validated.pages;
  }

  let locale: string | undefined;
  if (validated.locale != null) {
    locale = validateLocale(validated.locale);
  }

  return {
    ...(features.length > 0 ? { features: features.join(',') } : {}),
    ...(locale !== undefined ? { locale } : {}),
    ...(pages !== undefined ? { pages } : {}),
    expectedPageCount,
  };
}
