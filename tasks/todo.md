# Tasks: Retire Location Decision Information

This is the plan-level task index. After plan approval, each item will be
expanded with exact files, red/green test steps, acceptance criteria, and
verification commands before implementation begins.

## Phase A: Public and Admin UI

- [ ] A1. Delete the Location DecisionBlock and its map-open action; add a
      composition regression assertion.
- [ ] A2. Remove Location equipment from route guidance while preserving route
      metrics, overview, tips, and warnings.
- [ ] A3. Remove Location equipment inputs, validation, state, and payload data
      from the admin form.
- [ ] Checkpoint A: run focused public-detail and admin-form tests.

## Phase B: API and Domain

- [ ] B1. Make both retired request keys discard-only, remove Location response
      mapping, and remove equipment from Team-embedded Location responses.
- [ ] B2. Remove retired properties from the public Location contract and stored
      Location JSON type.
- [ ] Checkpoint B: run focused server tests, lint, and type-check.

## Phase C: Existing Data

- [ ] C1. Add migration `0006`, journal/snapshot metadata, and a regression test
      proving only the two equipment JSON paths are removed.
- [ ] Checkpoint C: run the local migration/reset test and `pnpm db:check`.

## Phase D: Language and Documentation

- [ ] D1. Remove retired admin form translations from all source locales.
- [ ] D2. Remove retired location-detail decision, map-action, and equipment
      translations from all source locales.
- [ ] D3. Remove the obsolete shared Location equipment label and regenerate
      locale data/types.
- [ ] D4. Update current API, database, and frontend-page documentation.
- [ ] Checkpoint D: run i18n build/generation/validation and documentation checks.

## Phase E: Final Quality and Repository Hygiene

- [ ] E1. Run full quality gates and a multi-axis code review; resolve all
      actionable findings within scope.
- [ ] E2. Confirm remaining gear references are Team-only, remove temporary
      `tasks/` artifacts, and verify the final diff contains no unrelated work.

## Delivery Boundary

Implementation starts only after separate approval of this plan and the expanded
task breakdown. Production deployment and remote D1 operations are not included.
