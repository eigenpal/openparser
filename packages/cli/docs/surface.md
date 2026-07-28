# openparser CLI surface

Generated from the live Commander command tree in `packages/cli/src/cli.ts`. Run `bun run --cwd packages/cli generate` to refresh.

```
openparser
├── status
├── auth
│   ├── login
│   ├── logout [profile]
│   ├── list
│   └── use <profile>
├── models
│   ├── ocr
│   └── llm
├── parse
│   ├── sync [file]
│   ├── async [file]
│   └── batch [files...]
├── extract
│   ├── sync [file]
│   ├── async [file]
│   ├── batch [files...]
│   └── suggest-schema
├── jobs
│   ├── list
│   ├── get <jobId>
│   ├── result <jobId>
│   └── source <jobId>
├── files
│   ├── upload <file>
│   ├── get <fileId>
│   ├── download <fileId>
│   └── delete <fileId>
└── pipelines
    ├── list
    ├── get <pipelineId>
    ├── create
    ├── update <pipelineId>
    └── delete <pipelineId>
```
