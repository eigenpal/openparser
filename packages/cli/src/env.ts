/**
 * CLI env — validated at module load via @t3-oss/env-core.
 */

import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    OPENPARSER_BASE_URL: z.string().optional(),
    OPENPARSER_API_KEY: z.string().optional(),
    OPENPARSER_DIR: z.string().optional(),
    OPENPARSER_PROFILE: z.string().optional(),
    DEBUG: z.string().optional(),
    NO_COLOR: z.string().optional(),
    CI: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === 'true' || process.env.npm_lifecycle_event === 'lint',
});
