export const HPS_INTERNAL_INVARIANTS = {
  formatBlockContent: true,
  visualize: false,
} as const;

export type HpsNativeOptions = {
  formatBlockContent: true;
  visualize: false;
  useChartRecognition: boolean;
  useOcrForImageBlock: boolean;
  returnMarkdownImages: boolean;
  mergeLayoutBlocks: boolean;
};

export const LOCKED_HPS_NATIVE_OPTIONS = {
  ...HPS_INTERNAL_INVARIANTS,
  useChartRecognition: true,
  useOcrForImageBlock: false,
  returnMarkdownImages: false,
  mergeLayoutBlocks: false,
} as const satisfies HpsNativeOptions;
