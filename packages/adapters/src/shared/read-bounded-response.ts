/**
 * Bounded response body reads for provider HTTP clients.
 * Never logs or persists response payloads.
 */
export async function readBoundedResponseText(
  response: Response,
  maxBytes: number
): Promise<{ text: string | null; truncated: boolean; readFailed: boolean }> {
  try {
    const reader = response.body?.getReader();
    if (!reader) {
      const text = await response.text();
      if (text.length <= maxBytes) {
        return { text: text.length > 0 ? text : null, truncated: false, readFailed: false };
      }
      return { text: text.slice(0, maxBytes), truncated: true, readFailed: false };
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    let truncated = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      if (total + value.length > maxBytes) {
        const remaining = maxBytes - total;
        if (remaining > 0) {
          chunks.push(value.slice(0, remaining));
          total += remaining;
        }
        truncated = true;
        try {
          await reader.cancel();
        } catch {
          // best-effort cancel after cap
        }
        break;
      }
      chunks.push(value);
      total += value.length;
    }

    if (chunks.length === 0) {
      return { text: null, truncated, readFailed: false };
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return {
      text: new TextDecoder('utf-8', { fatal: false }).decode(merged),
      truncated,
      readFailed: false,
    };
  } catch {
    return { text: null, truncated: false, readFailed: true };
  }
}
