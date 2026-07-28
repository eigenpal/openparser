import { defineConfig } from '@hey-api/openapi-ts';

/**
 * Configuration for `@hey-api/openapi-ts`.
 *
 * Reads the canonical OpenParser OCR OpenAPI spec and emits a typed SDK into
 * `src/generated/`. The hand-written `OpenParserClient` facade in
 * `src/client.ts` wraps the generated per-operation functions.
 *
 * The generated files are committed and shipped as part of the published
 * tarball — they are NOT regenerated on the user's machine.
 */
export default defineConfig({
  input: '../../docs/OCR_API_OPENAPI.yaml',
  output: {
    path: './src/generated',
    lint: false,
  },
  plugins: [
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: './src/runtime-config.ts',
    },
    '@hey-api/typescript',
    '@hey-api/sdk',
  ],
});
