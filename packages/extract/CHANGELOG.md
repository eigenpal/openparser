# @openparser/extract

## 1.0.5

### Minor Changes

- d46a558: Grounded extraction now ships as `@openparser/extract`, a runtime-neutral library that hosts run in-process. Hosts inject structured completion; the package owns schema preparation, the repair loop, validation, source-tagged rendering, citation resolution, and lineage production so Eigenpal and OpenParser extract the same way without the hosted extract service.

### Patch Changes

- Updated dependencies [d46a558]
  - @openparser/lineage@1.0.5
  - @openparser/schema@1.0.5

## 1.0.4

- Grounded extraction algorithm (`runGroundedExtraction`) with a structured-completion port.
