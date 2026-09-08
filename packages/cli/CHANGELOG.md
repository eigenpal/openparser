# @openparser/cli

## 1.0.5

### Patch Changes

- @openparser/sdk@1.0.5

## 1.0.4

### Patch Changes

- @openparser/sdk@1.0.4

## 1.0.3

### Patch Changes

- Updated dependencies [57ccf0b]
  - @openparser/sdk@1.0.3

## 1.0.2

### Minor Changes

- e7bd767: Grounded extraction now makes every output field explainable. The extraction API can return a portable `lineage@1` derivation DAG connecting values to source text, page geometry, the closest recognition confidence supplied by the OCR model, and every operation that produced them. Downstream systems can append normalization, calculation, inference, and review activities without losing the original evidence.

  The new `@openparser/lineage` package provides runtime schemas, graph validation, traversal and builder helpers, and W3C PROV interoperability for using the same lineage protocol beyond document extraction. `fields()` and `fieldTrace()` return an output field, its confidence, and its supporting evidence directly, so per-field explanations do not require walking the graph.

  Lineage documents stay small enough to return with every extraction. Each field points back to the passage it came from and a single confidence for that passage, without repeating the word-by-word parse that already ships beside it. A typical multi-field result is now a few kilobytes per field, so full evidence arrives with the result rather than being dropped when it grows too large.

  `fields()` and `fieldTrace()` fill in the rest on demand — a field's display path, whether its confidence was reported or derived, and whether it is grounded — so consumers do not have to reconstruct those answers themselves. The document names the model behind each step and keeps the original evidence, not presentation strings.

  OpenParser Studio starts new Playground sessions with field grounding, so clicking a value immediately reveals where it came from. New review endpoints, SDK helpers, and `openparser jobs review` commands let teams confirm field values, or approve or reject a whole extraction, while preserving the original machine output and an attributed event history.

- e7bd767: Extraction review now asks a reviewer for one thing: confirm what a field should say. If the value is right, confirming it signs it off; if it is wrong, correct it in the same box and confirming records the correction and the sign-off together. There is no longer a separate approve step to remember, and no way to end up with an approval that describes a value nobody agreed to — a sign-off always names the exact value it was given.

  Confirming keeps you on the field, so the confirmation you just made is there to read, and Previous and Next below it move through the queue in the order the field list shows — lowest confidence first — for working a run field by field without going back to the list between each one.

  Once a field is confirmed, the card that asked for the confirmation says so plainly: it turns green, carries a tick and the number of reviewers behind the value, and names whether the value was confirmed as it stood or corrected. Revisiting a field never leaves you hunting through its history to work out whether you already signed it off.

  Each confirmation survives a refresh, appears in the field's history next to what it changed, and names the person who made it and when. Several reviewers can confirm the same field and each is counted separately, so a team can require two people on anything below a confidence threshold before treating it as settled. A field shows how many reviewers stand behind its current value, and you are still asked for your own confirmation on a field a colleague has already confirmed. Confirming is not a one-way door: a reviewer can still take back an eligible confirmation.

  Reviewers can take back their own most recent confirmation on a field — and only that one. Withdrawing a signature from a value someone else also confirmed leaves that value standing; withdrawing one that introduced a value restores exactly what the field said before. Neither erases anything: the withdrawal is kept in the review trail. A confirmation cannot be taken back once another value has been built on top of it, and signing the run off freezes every field until the run is reopened.

  Confirmations apply to anything lineage can describe, not just output fields, so teams reviewing pages or extracted regions record sign-off the same way. A confirmation covers only what it names: confirming a field makes no claim about the region it was read from.

  `openparser jobs review-update` follows the same shape: `--confirm-json` takes the `{ path, value }` entries that used to go to `--changes-json`, and a value that differs from the current one corrects the field as it signs it off.

- e7bd767: Signing a whole run off is now unmistakable and reversible. An approved run reads as approved at a glance — the card turns green and carries the decision — and a rejected one turns red, so nobody has to hunt through a field trace to find out where a run stands. The job list and each job's own page show the same verdict, so a reviewer can see which runs are settled and which still need someone before opening any of them.

  Job rows also stopped shouting the obvious. A finished job no longer wears a "succeeded" badge that looks just like an approval; instead the row's icon carries where the job is — spinning while it runs, waiting while it is queued — and a failure tints the whole row red. That leaves green and red on a job row meaning what a person decided, not a second copy of what the machine did.

  A sign-off is no longer a one-way door. The reviewer who approved or rejected a run can reopen it, which returns the run to pending and unfreezes its fields for another pass — useful when a correction arrives after sign-off, or when the wrong button was clicked. Only the reviewer who signed the run off can reopen it, so one person cannot quietly undo another's decision.

  Reopening hides nothing. Both the sign-off and the reopening stay in the review trail, attributed and timestamped, and the run's lineage reflects the decision that currently stands rather than every decision ever made. An auditor can still see that a run was approved on Tuesday, reopened on Wednesday, and rejected on Thursday.

  `POST /jobs/{id}/review/reopen` exposes this to API, SDK, and CLI callers, and both `GET /jobs` and `GET /jobs/{id}` now report `review_status`, omitting it entirely for jobs nobody has reviewed. `GET /jobs/{id}` also reports `completed_at`, so clients can measure processing time without later review activity changing it. `openparser jobs review-reopen` does the same from the command line.

  Reformatted values now carry confidence that says what was actually checked. OpenParser gives a transform full confidence only when a declared transform plan permits a versioned validator and that validator proves its narrow claim. Date/time formatting, exact decimal and unit conversions, quantity magnitudes, currency policies, aliases, and controlled text normalization can be checked without another model call. Otherwise the structured transform claim keeps the extraction model's coarse `low`, `medium`, or `high` assessment visibly reported and uncalibrated, and confidence stays unknown when nobody measured the rewrite.

### Patch Changes

- Updated dependencies [e7bd767]
- Updated dependencies [e7bd767]
- Updated dependencies [e7bd767]
- Updated dependencies [e7bd767]
- Updated dependencies [e7bd767]
- Updated dependencies [e7bd767]
- Updated dependencies [e7bd767]
- Updated dependencies [e7bd767]
- Updated dependencies [e7bd767]
  - @openparser/sdk@1.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [dc94fcc]
  - @openparser/sdk@1.0.1

## 1.0.0

### Minor Changes

- 34c31bd: `@openparser/schema` is now document-only: `openparser@1` graph types plus the generic raw OCR envelope. Hosted API request/job/catalog/extraction wire schemas moved out of the published package (private Eigenpal workspace surface). Install `@openparser/schema` for document validation; use the SDKs for the hosted HTTP API.

### Patch Changes

- Updated dependencies [34c31bd]
- Updated dependencies [34c31bd]
  - @openparser/sdk@1.0.0

## 0.1.0

### Patch Changes

- fdf6bae: Fix binary downloads in the TypeScript SDK and CLI, detect upload media types in the CLI, preserve Python response fields such as `items`, and publish declarations that work in NodeNext projects.
- Updated dependencies [fdf6bae]
  - @openparser/sdk@0.1.0

## 0.0.4

### Patch Changes

- 63a2368: Align package descriptions and CLI help with the public guides, and organize the repository package table by use case.
- Updated dependencies [63a2368]
  - @openparser/sdk@0.0.4

## 0.0.3

### Patch Changes

- f241476: Rewrite the public repository and package guides with clearer setup instructions, examples, and contribution steps.
- Updated dependencies [f241476]
  - @openparser/sdk@0.0.4

## 0.0.2

### Patch Changes

- f23f255: Make the OpenParser repository easier to navigate with direct links to the website, documentation, source directories, and published packages.
- Updated dependencies [f23f255]
  - @openparser/sdk@0.0.3

## 0.0.1

### Minor Changes

- 6483fb4: Initial public release of the OpenParser package suite.
  - `@openparser/schema` — openparser@1 wire schemas and shared types
  - `@openparser/adapters` — provider adapters for OCR backends
  - `@openparser/sdk` — TypeScript client generated from the public OpenAPI contract
  - `openparser-sdk` (PyPI) — Python client (`from openparser import OpenParserClient`)
  - `@openparser/cli` — command-line interface for parse, extract, jobs, and pipelines

  Lockstep version `0.1.0` (minor bump from the `0.0.0` source baseline) keeps the four npm packages and the Python distribution on one suite version.

### Patch Changes

- Updated dependencies [6483fb4]
  - @openparser/sdk@0.1.0
