import { OpenParserClient } from '@openparser/sdk';
import type { CliConfig } from './config';

export function createSdkClient(config: CliConfig): OpenParserClient {
  return new OpenParserClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });
}
