import type { Command } from 'commander';
import pc from 'picocolors';

export { pc };

export const ui = {
  ok: pc.green,
  err: pc.red,
  warn: pc.yellow,
  info: pc.cyan,
  dim: pc.dim,
  bold: pc.bold,
};

let quietMode = false;

export function setQuiet(value: boolean): void {
  quietMode = value;
}

export function success(message: string): void {
  if (quietMode) return;
  process.stderr.write(`${pc.green('✓')} ${message}\n`);
}

export function error(message: string): void {
  process.stderr.write(`${pc.red('✗')} ${message}\n`);
}

export function info(message: string): void {
  if (quietMode) return;
  process.stderr.write(`${pc.cyan('ℹ')} ${message}\n`);
}

export function warn(message: string): void {
  process.stderr.write(`${pc.yellow('!')} ${message}\n`);
}

export function dim(message: string): void {
  if (quietMode) return;
  process.stderr.write(`${pc.dim(message)}\n`);
}

export interface TableColumn<T> {
  key: keyof T & string;
  header: string;
  format?: (value: T[keyof T], row: T) => string;
  align?: 'left' | 'right';
}

export function table<T extends Record<string, unknown>>(
  rows: T[],
  columns: TableColumn<T>[]
): string {
  if (rows.length === 0) return pc.dim('(no rows)');

  const formatted = rows.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      if (col.format) return col.format(value as T[keyof T], row);
      if (value == null) return '-';
      return String(value);
    })
  );

  const widths = columns.map((col, i) => {
    const dataMax = Math.max(0, ...formatted.map((r) => r[i].length));
    return Math.max(col.header.length, dataMax);
  });

  const align = (text: string, idx: number): string => {
    const w = widths[idx];
    return columns[idx].align === 'right' ? text.padStart(w) : text.padEnd(w);
  };

  const headerLine = columns.map((col, i) => align(col.header, i)).join('  ');
  const separator = pc.dim(widths.map((w) => '─'.repeat(w)).join('  '));
  const dataLines = formatted.map((cells) => cells.map((c, i) => align(c, i)).join('  '));

  return [headerLine, separator, ...dataLines].join('\n');
}

export function addJsonFlag<C extends Command>(cmd: C): C {
  return cmd.option('--json', 'Output the raw server response as JSON') as C;
}

export function withBaseUrl<C extends Command>(cmd: C): C {
  return cmd.option('--base-url <url>', 'OpenParser API base URL') as C;
}

export function intArg(value: string): number {
  return Number.parseInt(value, 10);
}

export function formatTimestamp(value: unknown): string {
  if (value == null) return '-';
  const text = typeof value === 'string' ? value : String(value);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

export function writeJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function writeData(data: unknown, opts: { json?: boolean }): void {
  if (opts.json) {
    writeJson(data);
    return;
  }
  writeJson(data);
}
