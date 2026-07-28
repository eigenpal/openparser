import { z } from 'zod';

export const OCR_OUTPUT_FORMATS = ['openparser@1', 'raw'] as const;
export const OcrOutputFormatSchema = z.enum(OCR_OUTPUT_FORMATS);
export type OcrOutputFormat = z.infer<typeof OcrOutputFormatSchema>;

export const PaddleRawProfileSchema = z
  .object({
    name: z.literal('eigenpal-paddle-layout-v1'),
    options: z
      .object({
        format_block_content: z.literal(true),
        use_chart_recognition: z.boolean(),
        use_ocr_for_image_block: z.boolean(),
        return_markdown_images: z.boolean(),
        visualize: z.literal(false),
        image_block_ocr: z.boolean(),
        chart_recognition: z.boolean(),
        /** Absent on raw jobs created before this request option was introduced. */
        merge_layout_blocks: z.boolean().optional(),
      })
      .strict(),
  })
  .strict();

export const RawParseResultSchema = z
  .object({
    output_format: z.literal('raw'),
    provider: z.literal('paddle'),
    model: z.literal('paddleocr-vl-1.6'),
    profile: PaddleRawProfileSchema,
    result: z.record(z.string(), z.unknown()),
  })
  .strict();

export type RawParseResult = z.infer<typeof RawParseResultSchema>;
