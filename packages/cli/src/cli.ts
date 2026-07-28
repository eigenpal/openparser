#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from '../package.json' with { type: 'json' };
import { authList, authLogin, authLogout, authUse } from './commands/auth';
import { extractAsync, extractBatch, extractSync, suggestSchema } from './commands/extract';
import { filesDelete, filesDownload, filesGet, filesUpload } from './commands/files';
import { jobsGet, jobsList, jobsResult, jobsSource } from './commands/jobs';
import { modelsLlm, modelsOcr } from './commands/models';
import { parseAsync, parseBatch, parseSync } from './commands/parse';
import {
  pipelinesCreate,
  pipelinesDelete,
  pipelinesGet,
  pipelinesList,
  pipelinesUpdate,
} from './commands/pipelines';
import { status } from './commands/status';
import { action } from './lib/format-error';
import { addJsonFlag, intArg, setQuiet, withBaseUrl } from './lib/ui';

export const program = new Command();

const cliVersion = pkg.version === '0.0.0-placeholder' ? 'dev' : pkg.version;

program
  .name('openparser')
  .description('OpenParser CLI — parse and extract documents from your terminal')
  .enablePositionalOptions()
  .version(cliVersion, '-v, --version', 'Print the CLI version and exit')
  .option(
    '-q, --quiet',
    'Suppress informational status output on stderr. JSON/data on stdout is unaffected.'
  )
  .hook('preAction', () => {
    if (program.opts().quiet) setQuiet(true);
  });

withBaseUrl(
  addJsonFlag(
    program
      .command('status')
      .description('Verify API connectivity and show the active profile context.')
  )
).action(action(async (opts: { baseUrl?: string; json?: boolean }) => status(opts)));

const authCmd = program
  .command('auth')
  .description(
    'Manage authentication profiles in ~/.config/openparser/credentials.json. Switch with `auth use` or OPENPARSER_PROFILE.'
  );

authCmd
  .command('login')
  .description('Store an API key in a named profile and validate it against the API.')
  .option('--base-url <url>', 'OpenParser API base URL')
  .option(
    '--profile <name>',
    'Profile name to create or update (default: default). Makes that profile active.'
  )
  .action(async (opts: { baseUrl?: string; profile?: string }) => {
    await authLogin(opts);
  });

authCmd
  .command('logout [profile]')
  .description('Remove a saved profile (defaults to the active profile).')
  .action(async (profile: string | undefined) => {
    await authLogout(profile);
  });

authCmd
  .command('list')
  .description('List saved profiles.')
  .option('--json', 'Emit machine-readable JSON')
  .action((opts: { json?: boolean }) => {
    authList(opts);
  });

authCmd
  .command('use <profile>')
  .description('Switch the persistent active profile.')
  .action(async (profile: string) => {
    await authUse(profile);
  });

const modelsCmd = program.command('models').description('List OCR and LLM model catalogs.');

withBaseUrl(addJsonFlag(modelsCmd.command('ocr').description('List OCR models.'))).action(
  action(async (opts: { baseUrl?: string; json?: boolean }) => modelsOcr(opts))
);

withBaseUrl(
  addJsonFlag(
    modelsCmd
      .command('llm')
      .description('List compatible LLM models.')
      .option('--mode <mode>', 'suggested or search', 'suggested')
      .option('--q <query>', 'Search query (search mode)')
      .option('--page <n>', 'Page number', intArg, 1)
      .option('--limit <n>', 'Page size', intArg, 50)
  )
).action(
  action(
    async (opts: {
      baseUrl?: string;
      json?: boolean;
      mode?: string;
      q?: string;
      page?: number;
      limit?: number;
    }) => modelsLlm(opts)
  )
);

const parseCmd = program.command('parse').description('Parse documents.');

function parseOptions(cmd: Command): Command {
  return withBaseUrl(
    addJsonFlag(
      cmd
        .option('--ocr-model <id>', 'OCR model id', 'paddleocr-vl-1.6')
        .option('--output-format <fmt>', 'openparser@1 or raw', 'openparser@1')
        .option('--file-id <id>', 'Reuse a pooled file id instead of uploading bytes')
        .option('--idempotency-key <key>', 'Idempotency-Key header override')
    )
  );
}

parseOptions(
  parseCmd
    .command('sync')
    .description('Parse synchronously and print the result JSON.')
    .argument('[file]', 'Document to parse')
).action(
  action(async (file: string | undefined, opts) => {
    await parseSync(file, opts);
  })
);

parseOptions(
  parseCmd
    .command('async')
    .description('Admit an async parse job.')
    .argument('[file]', 'Document to parse')
).action(
  action(async (file: string | undefined, opts) => {
    await parseAsync(file, opts);
  })
);

withBaseUrl(
  addJsonFlag(
    parseCmd
      .command('batch')
      .description(
        'Admit a parse batch. Pass --request JSON (ParseBatchRequest); optional files map to file_index.'
      )
      .requiredOption('--request <path>', 'ParseBatchRequest JSON file')
      .argument('[files...]', 'Ordered files referenced by item file_index values')
      .option('--idempotency-key <key>', 'Idempotency-Key header override')
  )
).action(
  action(
    async (
      files: string[],
      opts: { baseUrl?: string; json?: boolean; request: string; idempotencyKey?: string }
    ) => {
      await parseBatch(files ?? [], opts);
    }
  )
);

const extractCmd = program
  .command('extract')
  .description('Extract structured data from documents.');

function extractOptions(cmd: Command): Command {
  return withBaseUrl(
    addJsonFlag(
      cmd
        .option('--ocr-model <id>', 'OCR model id', 'paddleocr-vl-1.6')
        .option('--llm-model <id>', 'LLM model id', 'openai/gpt-4.1-mini')
        .option('--schema <path>', 'JSON Schema file for inline extraction')
        .option('--schema-json <json>', 'Inline JSON Schema string')
        .option('--pipeline-id <id>', 'Saved extraction pipeline id')
        .option('--file-id <id>', 'Reuse a pooled file id')
        .option('--parse-job-id <id>', 'Reuse a succeeded parse job')
        .option('--grounding <mode>', 'none or field')
        .option('--repair-attempts <n>', 'Schema repair attempts (0-2)', intArg)
        .option('--output-format <fmt>', 'openparser@1 or raw')
        .option('--idempotency-key <key>', 'Idempotency-Key header override')
    )
  );
}

extractOptions(
  extractCmd
    .command('sync')
    .description('Extract synchronously and print the result JSON.')
    .argument('[file]', 'Document to extract from')
).action(
  action(async (file: string | undefined, opts) => {
    await extractSync(file, opts);
  })
);

extractOptions(
  extractCmd
    .command('async')
    .description('Admit an async extract job.')
    .argument('[file]', 'Document to extract from')
).action(
  action(async (file: string | undefined, opts) => {
    await extractAsync(file, opts);
  })
);

withBaseUrl(
  addJsonFlag(
    extractCmd
      .command('batch')
      .description(
        'Admit an extract batch. Pass --request JSON (ExtractBatchRequest); optional files map to file_index.'
      )
      .requiredOption('--request <path>', 'ExtractBatchRequest JSON file')
      .argument('[files...]', 'Ordered files referenced by item file_index values')
      .option('--idempotency-key <key>', 'Idempotency-Key header override')
  )
).action(
  action(
    async (
      files: string[],
      opts: { baseUrl?: string; json?: boolean; request: string; idempotencyKey?: string }
    ) => {
      await extractBatch(files ?? [], opts);
    }
  )
);

withBaseUrl(
  addJsonFlag(
    extractCmd
      .command('suggest-schema')
      .description('Suggest an extraction JSON Schema from a succeeded parse job.')
      .requiredOption('--parse-job-id <id>', 'Succeeded parse job id (opj_…)')
      .option('--hint <text>', 'Optional guidance for the suggestion model (max 500 chars)')
  )
).action(
  action(async (opts: { baseUrl?: string; json?: boolean; parseJobId: string; hint?: string }) => {
    await suggestSchema(opts);
  })
);

const jobsCmd = program.command('jobs').description('Inspect durable parse and extract jobs.');

withBaseUrl(
  addJsonFlag(
    jobsCmd
      .command('list')
      .description('List jobs for the authenticated tenant.')
      .option('--cursor <cursor>', 'Pagination cursor')
      .option('--limit <n>', 'Page size', intArg, 50)
      .option('--status <status>', 'Filter by job status')
      .option('--operation <operation>', 'Filter by operation')
  )
).action(
  action(
    async (opts: {
      baseUrl?: string;
      json?: boolean;
      cursor?: string;
      limit?: number;
      status?: string;
      operation?: string;
    }) => jobsList(opts)
  )
);

withBaseUrl(
  addJsonFlag(
    jobsCmd
      .command('get <jobId>')
      .description('Fetch a job by id.')
      .option('--cursor <cursor>', 'Child pagination cursor for batch jobs')
      .option('--limit <n>', 'Child page size', intArg, 50)
  )
).action(
  action(
    async (
      jobId: string,
      opts: { baseUrl?: string; json?: boolean; cursor?: string; limit?: number }
    ) => {
      await jobsGet(jobId, opts);
    }
  )
);

withBaseUrl(
  addJsonFlag(
    jobsCmd
      .command('result <jobId>')
      .description('Fetch the terminal result body for a job.')
      .option('--format <format>', 'openparser@1 or raw')
  )
).action(
  action(async (jobId: string, opts: { baseUrl?: string; json?: boolean; format?: string }) => {
    await jobsResult(jobId, opts);
  })
);

withBaseUrl(
  jobsCmd
    .command('source <jobId>')
    .description('Download retained source bytes for a job.')
    .option('-o, --output <path>', 'Write bytes to a file instead of stdout')
).action(
  action(async (jobId: string, opts: { baseUrl?: string; output?: string }) => {
    await jobsSource(jobId, opts);
  })
);

const filesCmd = program.command('files').description('Manage reusable uploaded files.');

withBaseUrl(
  addJsonFlag(filesCmd.command('upload <file>').description('Upload a file to the pool.'))
).action(
  action(async (file: string, opts: { baseUrl?: string; json?: boolean }) => {
    await filesUpload(file, opts);
  })
);

withBaseUrl(
  addJsonFlag(filesCmd.command('get <fileId>').description('Fetch file metadata.'))
).action(
  action(async (fileId: string, opts: { baseUrl?: string; json?: boolean }) => {
    await filesGet(fileId, opts);
  })
);

withBaseUrl(
  addJsonFlag(
    filesCmd
      .command('download <fileId>')
      .description('Download file bytes.')
      .option('-o, --output <path>', 'Write bytes to a file instead of stdout')
  )
).action(
  action(async (fileId: string, opts: { baseUrl?: string; json?: boolean; output?: string }) => {
    await filesDownload(fileId, opts);
  })
);

withBaseUrl(
  addJsonFlag(filesCmd.command('delete <fileId>').description('Delete a pooled file.'))
).action(
  action(async (fileId: string, opts: { baseUrl?: string; json?: boolean }) => {
    await filesDelete(fileId, opts);
  })
);

const pipelinesCmd = program.command('pipelines').description('Manage saved extraction pipelines.');

withBaseUrl(
  addJsonFlag(pipelinesCmd.command('list').description('List extraction pipelines.'))
).action(action(async (opts: { baseUrl?: string; json?: boolean }) => pipelinesList(opts)));

withBaseUrl(
  addJsonFlag(pipelinesCmd.command('get <pipelineId>').description('Fetch a pipeline by id.'))
).action(
  action(async (pipelineId: string, opts: { baseUrl?: string; json?: boolean }) => {
    await pipelinesGet(pipelineId, opts);
  })
);

withBaseUrl(
  addJsonFlag(
    pipelinesCmd
      .command('create')
      .description('Create a saved extraction pipeline.')
      .requiredOption('--name <name>', 'Pipeline display name')
      .option('--slug <slug>', 'URL-safe slug')
      .option('--schema <path>', 'JSON Schema file')
      .option('--schema-json <json>', 'Inline JSON Schema')
      .option('--llm-model <id>', 'LLM model id', 'openai/gpt-4.1-mini')
      .option('--ocr-model <id>', 'OCR model id', 'paddleocr-vl-1.6')
      .option('--grounding <mode>', 'none or field')
      .option('--repair-attempts <n>', 'Schema repair attempts (0-2)', intArg)
      .option('--body <json>', 'Full request JSON (overrides other flags)')
  )
).action(
  action(
    async (opts: {
      baseUrl?: string;
      json?: boolean;
      name: string;
      slug?: string;
      schema?: string;
      schemaJson?: string;
      llmModel?: string;
      ocrModel?: string;
      grounding?: string;
      repairAttempts?: number;
      body?: string;
    }) => pipelinesCreate(opts)
  )
);

withBaseUrl(
  addJsonFlag(
    pipelinesCmd
      .command('update <pipelineId>')
      .description('Update a saved extraction pipeline.')
      .option('--name <name>', 'New display name')
      .option('--slug <slug>', 'URL-safe slug (pass empty string to clear)')
      .option('--schema <path>', 'JSON Schema file')
      .option('--schema-json <json>', 'Inline JSON Schema')
      .option('--llm-model <id>', 'LLM model id')
      .option('--ocr-model <id>', 'OCR model id')
      .option('--grounding <mode>', 'none or field')
      .option('--repair-attempts <n>', 'Schema repair attempts (0-2)', intArg)
      .option('--body <json>', 'Full request JSON (overrides other flags)')
  )
).action(
  action(
    async (
      pipelineId: string,
      opts: {
        baseUrl?: string;
        json?: boolean;
        name?: string;
        slug?: string;
        schema?: string;
        schemaJson?: string;
        llmModel?: string;
        ocrModel?: string;
        grounding?: string;
        repairAttempts?: number;
        body?: string;
      }
    ) => pipelinesUpdate(pipelineId, opts)
  )
);

withBaseUrl(
  addJsonFlag(pipelinesCmd.command('delete <pipelineId>').description('Delete a pipeline.'))
).action(
  action(async (pipelineId: string, opts: { baseUrl?: string; json?: boolean }) => {
    await pipelinesDelete(pipelineId, opts);
  })
);

const __filename = path.resolve(fileURLToPath(import.meta.url));
const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
const isDirect =
  invoked === __filename ||
  invoked === path.join(path.dirname(__filename), 'cli.ts') ||
  invoked.endsWith(`${path.sep}openparser`) ||
  invoked.endsWith(`${path.sep}openparser-dev`);

if (isDirect) {
  program.parseAsync(process.argv).catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
