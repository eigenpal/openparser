# Contributing to OpenParser

Thanks for your interest in improving OpenParser.

## Source of truth & backporting

**The Eigenpal monorepo is the source of truth** for OpenParser packages while
this mirror remains private (and when it becomes public). Mirror syncs are
one-way: Eigenpal → `eigenpal/openparser`.

Destructive sync will **refuse** to run when the mirror contains:

- Files that are not part of the mirrored snapshot (public-only paths)
- Commits after the latest `release: openparser@*` sync commit

If you open a PR against this repository:

1. Maintainers backport the change into the Eigenpal monorepo.
2. The mirror is reset to the last sync commit (or the public-only paths are
   removed) so provenance is clean.
3. A new sync publishes the backported change.

Do not expect a mirror-only commit to survive the next sync without a backport.

Source of truth is the Eigenpal monorepo (not github.com/eigenpal/openparser).

If the mirror has community/public-only commits or files:
  1. Cherry-pick or manually port the change into the Eigenpal monorepo PR.
  2. Reset the mirror branch to the last `release: openparser@*` commit
     (or delete the public-only paths) so HEAD matches mirror provenance.
  3. Re-run sync-openparser-mirror (dry_run first).

Do not force-push over unreviewed community work without an explicit backport.

## Filing issues

Bug reports and feature requests are welcome at
https://github.com/eigenpal/openparser/issues. When filing a bug, please include:

- Package name + version (`@openparser/sdk`, `openparser` CLI, etc.)
- The exact command or API call
- The full error output
- Your OS and runtime versions

## Pull requests

We accept pull requests for:

- Bug fixes (with a clear repro)
- Documentation improvements
- New tests covering existing behavior

For larger changes (new public APIs, breaking schema changes), please open an
issue first to discuss the proposal.

## Local development

```bash
bun install
bun run typecheck
bun test
```

Schema and adapter packages are TypeScript source. The TypeScript SDK ships
committed generated clients under `src/generated/`; the Python SDK ships
committed clients under `src/openparser/_generated/`. Prefer updating the
OpenAPI source and regenerating rather than hand-editing generated trees.

## Code of conduct

Be kind. Assume good faith. We're a small project — let's keep it pleasant.
