import type { CreateClientConfig } from './generated/client.gen';

/**
 * Runtime configuration hook for the generated hey-api client.
 *
 * The hand-written `OpenParserClient` class in `client.ts` calls
 * `createConfig()` on construction with the user's `apiKey` and
 * `baseUrl`, so the generated SDK functions automatically pick up the
 * Authorization header. This factory returns a no-op default — values
 * are populated when an `OpenParserClient` instance is created.
 */
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: config?.baseUrl ?? 'https://api.openparser.dev',
});
