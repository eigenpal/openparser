#!/usr/bin/env bun
/**
 * Regenerate CLI docs under packages/cli/docs/ from the live Commander tree.
 */

import type { Command, Option } from 'commander';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

import { program } from '../src/cli';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(__dirname, '..', 'docs');
const REPO_ROOT = join(__dirname, '..', '..', '..');

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function commandDisplayName(cmd: Command): string {
  const alias = cmd.alias();
  return alias ? `${cmd.name()}|${alias}` : cmd.name();
}

function commandPath(cmd: Command): string {
  const segments: string[] = [];
  let current: Command | null = cmd;
  while (current && current.name() !== 'openparser') {
    segments.unshift(commandDisplayName(current));
    current = current.parent ?? null;
  }
  return segments.join(' ');
}

function visibleCommands(cmd: Command): Command[] {
  return cmd.commands.filter((c) => !c.hidden && c.name() !== 'help');
}

function docChildren(cmd: Command): Command[] {
  return visibleCommands(cmd);
}

function visibleOptions(cmd: Command): Option[] {
  return (cmd.options as Option[]).filter((o) => !o.hidden);
}

function commandUsage(cmd: Command): string {
  const path = commandPath(cmd);
  const usage = cmd.usage();
  return `openparser ${path}${usage ? ' ' + usage : ''}`.trim();
}

function renderArgumentsTable(cmd: Command): string {
  const args = cmd.registeredArguments;
  if (args.length === 0) return '';
  const lines: string[] = [];
  lines.push('### Arguments');
  lines.push('');
  lines.push('| Name | Required | Variadic | Description |');
  lines.push('| --- | --- | --- | --- |');
  for (const arg of args) {
    lines.push(
      `| ${escapeCell(`\`${arg.name()}\``)} | ${arg.required ? 'yes' : 'no'} | ${arg.variadic ? 'yes' : 'no'} | ${escapeCell(arg.description || '')} |`
    );
  }
  lines.push('');
  return lines.join('\n');
}

function renderOptionsTable(cmd: Command): string {
  const opts = visibleOptions(cmd);
  if (opts.length === 0) return '';
  const lines: string[] = [];
  lines.push('### Options');
  lines.push('');
  lines.push('| Flag | Required | Default | Description |');
  lines.push('| --- | --- | --- | --- |');
  for (const opt of opts) {
    const flag = escapeCell(`\`${opt.flags}\``);
    const required = opt.mandatory ? 'yes' : 'no';
    const def =
      opt.defaultValue !== undefined ? escapeCell(`\`${JSON.stringify(opt.defaultValue)}\``) : '';
    lines.push(`| ${flag} | ${required} | ${def} | ${escapeCell(opt.description || '')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function collectLeafCommands(cmd: Command): Command[] {
  const children = visibleCommands(cmd);
  if (children.length === 0) return [cmd];
  return children.flatMap(collectLeafCommands);
}

interface CommandGroup {
  label: string;
  leaves: Command[];
}

function groupCommandsByNamespace(root: Command): CommandGroup[] {
  const coreLeaves: Command[] = [];
  const namespaceGroups: CommandGroup[] = [];
  for (const child of visibleCommands(root)) {
    if (visibleCommands(child).length === 0) {
      coreLeaves.push(child);
    } else {
      namespaceGroups.push({
        label: child.name().charAt(0).toUpperCase() + child.name().slice(1),
        leaves: collectLeafCommands(child),
      });
    }
  }
  return coreLeaves.length > 0
    ? [{ label: 'Core', leaves: coreLeaves }, ...namespaceGroups]
    : namespaceGroups;
}

function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function renderCommandTables(groups: CommandGroup[]): string {
  const lines: string[] = [];
  lines.push('## Commands');
  lines.push('');
  for (const group of groups) {
    lines.push(`### ${group.label}`);
    lines.push('');
    lines.push('| Command | Description |');
    lines.push('| --- | --- |');
    for (const cmd of group.leaves) {
      lines.push(
        `| ${escapeCell(`\`${commandUsage(cmd)}\``)} | ${escapeCell(cmd.description() || '')} |`
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderTableOfContents(groups: CommandGroup[]): string {
  const lines: string[] = [];
  lines.push('## Contents');
  lines.push('');
  lines.push('- [Surface](#surface)');
  lines.push('- [Commands](#commands)');
  for (const group of groups) {
    lines.push(`  - [${group.label}](#${slugify(group.label)})`);
  }
  lines.push('- [Details](#details)');
  for (const group of groups) {
    for (const cmd of group.leaves) {
      const heading = commandUsage(cmd);
      lines.push(`  - [\`${heading}\`](#${slugify(heading)})`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function renderCommandDetail(cmd: Command): string {
  const lines: string[] = [];
  lines.push(`### \`${commandUsage(cmd)}\``);
  lines.push('');
  if (cmd.description()) {
    lines.push(cmd.description());
    lines.push('');
  }
  const args = renderArgumentsTable(cmd);
  if (args) lines.push(args);
  const opts = renderOptionsTable(cmd);
  if (opts) lines.push(opts);
  return lines.join('\n');
}

function argSignature(cmd: Command): string {
  return cmd
    .usage()
    .replace(/\[options\]/g, '')
    .replace(/\[command\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderASCIITree(cmd: Command, prefix = '', isRoot = true): string {
  const lines: string[] = [];
  if (isRoot) lines.push(cmd.name());
  const children = docChildren(cmd);
  children.forEach((child, idx) => {
    const isLast = idx === children.length - 1;
    const branch = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';
    const sig = argSignature(child);
    lines.push(`${prefix}${branch}${commandDisplayName(child)}${sig ? ' ' + sig : ''}`);
    if (visibleCommands(child).length > 0) {
      lines.push(renderASCIITree(child, prefix + childPrefix, false));
    }
  });
  return lines.join('\n');
}

function renderTopLevelCommandFile(cmd: Command): string {
  const name = cmd.name();
  const lines: string[] = [];
  lines.push(`# openparser ${name}`);
  lines.push('');
  if (cmd.description()) {
    lines.push(cmd.description());
    lines.push('');
  }
  const hasChildren = visibleCommands(cmd).length > 0;
  if (hasChildren) {
    const groups = groupCommandsByNamespace(cmd);
    lines.push(renderTableOfContents(groups));
    lines.push('## Surface');
    lines.push('');
    lines.push('```');
    lines.push(renderASCIITree(cmd));
    lines.push('```');
    lines.push('');
    lines.push(renderCommandTables(groups));
    lines.push('## Details');
    lines.push('');
    for (const group of groups) {
      for (const leaf of group.leaves) {
        lines.push(renderCommandDetail(leaf));
      }
    }
  } else {
    const args = renderArgumentsTable(cmd);
    if (args) lines.push(args);
    const opts = renderOptionsTable(cmd);
    if (opts) lines.push(opts);
  }
  return lines.join('\n').trimEnd() + '\n';
}

function renderFullSurfaceFile(): string {
  const lines: string[] = [];
  lines.push('# openparser CLI surface');
  lines.push('');
  lines.push(
    'Generated from the live Commander command tree in `packages/cli/src/cli.ts`. Run `bun run --cwd packages/cli generate` to refresh.'
  );
  lines.push('');
  lines.push('```');
  lines.push(renderASCIITree(program));
  lines.push('```');
  return lines.join('\n').trimEnd() + '\n';
}

interface GeneratedFile {
  path: string;
  content: string;
}

async function collectFiles(): Promise<GeneratedFile[]> {
  const prettierConfig = await prettier.resolveConfig(DOCS_DIR);
  const format = (raw: string): Promise<string> =>
    prettier.format(raw, { ...prettierConfig, parser: 'markdown' });

  const files: GeneratedFile[] = [];
  files.push({
    path: join(DOCS_DIR, 'surface.md'),
    content: await format(renderFullSurfaceFile()),
  });
  for (const cmd of docChildren(program)) {
    files.push({
      path: join(DOCS_DIR, `${cmd.name()}.md`),
      content: await format(renderTopLevelCommandFile(cmd)),
    });
  }
  return files;
}

function listExistingMarkdown(): string[] {
  if (!existsSync(DOCS_DIR)) return [];
  return readdirSync(DOCS_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => join(DOCS_DIR, name));
}

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  if (!existsSync(DOCS_DIR)) mkdirSync(DOCS_DIR, { recursive: true });

  const files = await collectFiles();
  const wanted = new Set(files.map((f) => f.path));
  const stale = listExistingMarkdown().filter((p) => !wanted.has(p));

  let drift = false;

  for (const file of files) {
    const original = existsSync(file.path) ? readFileSync(file.path, 'utf8') : '';
    if (original === file.content) continue;
    if (check) {
      drift = true;
      console.error(`✗ ${relative(REPO_ROOT, file.path)} is out of date.`);
      continue;
    }
    writeFileSync(file.path, file.content);
    console.log(`✓ wrote ${relative(REPO_ROOT, file.path)}`);
  }

  for (const stalePath of stale) {
    if (check) {
      drift = true;
      console.error(`✗ ${relative(REPO_ROOT, stalePath)} is stale.`);
      continue;
    }
    unlinkSync(stalePath);
    console.log(`✓ removed ${relative(REPO_ROOT, stalePath)}`);
  }

  if (check && drift) {
    console.error('');
    console.error(
      "Run 'bun run --cwd packages/cli generate:cli-docs' and commit the result."
    );
    process.exit(1);
  }
  if (!check) {
    console.log(`✓ CLI docs up to date (${files.length} files).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
