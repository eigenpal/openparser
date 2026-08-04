import { z } from 'zod';

export const OCR_OUTPUT_FORMATS = ['openparser@1', 'raw'] as const;
export const OcrOutputFormatSchema = z.enum(OCR_OUTPUT_FORMATS);
export type OcrOutputFormat = z.infer<typeof OcrOutputFormatSchema>;

export const RawParseResultSchema = z
  .object({
    output_format: z.literal('raw'),
    provider: z.string().min(1).max(128),
    model: z.string().min(1).max(128),
    profile: z
      .object({
        name: z.string().min(1).max(256),
        options: z.record(z.string(), z.unknown()),
      })
      .strict(),
    result: z.record(z.string(), z.unknown()),
  })
  .strict();

export type RawParseResult = z.infer<typeof RawParseResultSchema>;
