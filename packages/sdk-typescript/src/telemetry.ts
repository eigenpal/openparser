/**
 * SDK telemetry headers attached to every outbound request.
 */

export const SDK_LANGUAGE = 'typescript';
export const SDK_VERSION = '0.0.4';

function detectRuntime(): string {
  const g = globalThis as unknown as {
    Bun?: { version: string };
    Deno?: { version?: { deno?: string } };
  };
  if (g.Bun?.version) return `bun-${g.Bun.version}`;
  if (g.Deno?.version?.deno) return `deno-${g.Deno.version.deno}`;
  if (typeof process !== 'undefined' && process.versions?.node) {
    return `node-${process.versions.node}`;
  }
  return 'browser';
}

function detectOs(): string {
  if (typeof process !== 'undefined' && process.platform) {
    return `${process.platform}-${process.arch}`;
  }
  return 'browser';
}

export function buildTelemetryHeaders(): Record<string, string> {
  const runtime = detectRuntime();
  const os = detectOs();
  return {
    'X-Openparser-Sdk': SDK_LANGUAGE,
    'X-Openparser-Sdk-Version': SDK_VERSION,
    'X-Openparser-Sdk-Runtime': runtime,
    'X-Openparser-Sdk-Os': os,
    'User-Agent': `openparser-sdk-typescript/${SDK_VERSION} (${runtime}; ${os})`,
  };
}
