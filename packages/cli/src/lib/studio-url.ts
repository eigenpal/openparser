/**
 * Map an OpenParser API base URL to the studio dashboard API-keys page.
 */
export function studioApiKeysUrl(apiBaseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(apiBaseUrl);
  } catch {
    return `${apiBaseUrl.replace(/\/+$/, '')}/api-keys`;
  }

  if (parsed.hostname === 'api.openparser.dev') {
    return 'https://studio.openparser.dev/api-keys';
  }
  if (parsed.hostname === 'sapi.openparser.dev') {
    return 'https://staging.openparser.dev/api-keys';
  }
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    const studioPort = parsed.port === '3100' ? '3001' : parsed.port || '3001';
    return `${parsed.protocol}//${parsed.hostname}:${studioPort}/api-keys`;
  }
  if (parsed.hostname.startsWith('api.')) {
    return `${parsed.protocol}//${parsed.hostname.replace(/^api\./, 'studio.')}/api-keys`;
  }
  if (parsed.hostname.startsWith('sapi.')) {
    return `${parsed.protocol}//${parsed.hostname.replace(/^sapi\./, 'staging.')}/api-keys`;
  }
  return `${parsed.origin}/api-keys`;
}
