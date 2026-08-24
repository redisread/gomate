# Tasks: Retire Location Decision Information

Status legend: `[ ]` pending, `[-]` in progress, `[x]` complete.

Every behavior task follows red → green: add or change the stated assertion,
run it to observe the current behavior fail, make the smallest implementation
change, then rerun it. Do not begin implementation until this breakdown is
approved.

## Phase A: Public Location UI

### [ ] A1. Delete DecisionBlock and its map-open action

**Depends on:** approved specification and plan

**Files:**

- Add `src/__tests__/location-detail-composition.test.ts`
- Delete `src/__tests__/decision-block.test.tsx`
- Delete `src/components/features/location-detail/decision-block.tsx`
- Modify `src/components/features/location-detail-client.tsx`

**Red test:** Add a composition boundary assertion that fails while the Location
detail client imports or renders `DecisionBlock` or its map action remains part
of the page composition.

**Implementation:** Remove the import and render site, then delete the complete
component and its obsolete state-machine test. Do not move the Amap action to a
different section and do not touch unrelated map components.

**Acceptance:**

- Location detail has no Decision Information section.
- The map-open action formerly owned by DecisionBlock is absent.
- No replacement transport/map CTA is introduced.
- Other Location detail sections retain their order and composition.

**Verify:**

```bash
pnpm vitest run --config vitest.config.ts src/__tests__/location-detail-composition.test.ts
rg -n "DecisionBlock|location-detail/decision-block" src
```

### [ ] A2. Remove Location equipment from route guidance

**Depends on:** A1

**Files:**

- Modify `src/components/features/location-detail/route-utils.test.ts`
- Modify `src/components/features/location-detail/route-utils.ts`
- Add `src/components/features/location-detail/route-info-card.test.tsx`
- Modify `src/components/features/location-detail/route-info-card.tsx`

**Red tests:** Assert that normalization exposes no equipment properties and
that a legacy gear-only Location does not create route content. Render the card
with legacy gear plus tips and warnings; assert tips and warnings remain while
the equipment label/items do not render.

**Implementation:** Remove equipment from `NormalizedLocationHiking`, its
content predicate, note computation, icon import, and `RouteNoteBlock` render.
Keep route metrics, overview, tips, and warnings unchanged.

**Acceptance:**

- Recommended Location equipment never renders in route guidance.
- Equipment-only legacy data cannot make the route card appear.
- Metrics, overview, tips, and warnings still normalize and render.

**Verify:**

```bash
pnpm vitest run --config vitest.config.ts \
  src/components/features/location-detail/route-utils.test.ts \
  src/components/features/location-detail/route-info-card.test.tsx
```

### Checkpoint A

```bash
pnpm test -- src/__tests__/location-detail-composition.test.ts \
  src/components/features/location-detail/route-utils.test.ts \
  src/components/features/location-detail/route-info-card.test.tsx
pnpm type-check
```

Expected result: public Location UI has no decision/map/equipment presentation,
and supported route guidance still passes.

## Phase B: Admin Location Form

### [ ] B1. Remove equipment inputs, validation, state, and payload

**Depends on:** Checkpoint A

**Files:**

- Modify `src/components/features/location-form/use-location-form.test.ts`
- Modify `src/components/features/location-form/use-location-form.ts`
- Delete `src/components/features/location-form/location-form-decision-fields.tsx`
- Modify `src/components/features/location-form/index.ts`
- Modify `src/components/features/location-edit-client.tsx`

**Red tests:** Change form projection and payload expectations to contain no
`gearEssential` or `gearOptional`, including when the input Location fixture is
cast with old values. Assert the rest of the hiking fields survive unchanged.

**Implementation:** Remove both fields from form and mutation types, defaults,
projection, cleanup, and payload construction. Remove the section export and
render site, then delete the equipment-only form component and its required-item
validation.

**Acceptance:**

- Create/edit forms show no equipment section or equipment validation error.
- Draft/form state and mutation payloads contain neither retired field.
- Difficulty, route facts, seasons, overview, tips, warnings, facilities,
  activities, and tags remain editable.

**Verify:**

```bash
pnpm vitest run --config vitest.config.ts \
  src/components/features/location-form/use-location-form.test.ts
rg -n "LocationFormDecisionFields|formGear|gearEssential|gearOptional" \
  src/components/features/location-form src/components/features/location-edit-client.tsx
```

### Checkpoint B

```bash
pnpm lint
pnpm type-check
pnpm test -- src/components/features/location-form/use-location-form.test.ts
```

Expected result: the admin UI and outgoing payload have no Location equipment
concept, without changing other full-editor fields.

## Phase C: API and Domain Model

### [ ] C1. Discard retired input and suppress all Location response output

**Depends on:** Checkpoint B

**Files:**

- Modify `src/server/routes/locations/utils.test.ts`
- Modify `src/server/routes/locations/utils.ts`
- Add `src/server/routes/teams/utils.test.ts`
- Modify `src/server/routes/teams/utils.ts`

**Red tests:**

1. Parse create and update inputs containing both retired keys; assert success,
   supported hiking fields preserved, and retired keys absent from normalized
   data.
2. Assert an unrelated unknown hiking key still fails strict validation.
3. Project stored JSON containing both snake_case keys through Location and Team
   mappers; assert neither response contains equipment while other hiking values
   remain.

**Implementation:** Keep exactly `gearEssential` and `gearOptional` as optional
discard-only unknown keys in the strict input object and transform them away.
Remove snake_case writes and reads from Location projection and Team-embedded
Location mapping.

**Acceptance:**

- Old create/update requests do not fail solely because of the two retired keys.
- Retired values are never normalized or written.
- All other unknown hiking keys remain rejected.
- Location and Team endpoints never emit retired equipment, even against
  pre-migration rows.

**Verify:**

```bash
pnpm vitest run --config vitest.server.config.ts \
  src/server/routes/locations/utils.test.ts \
  src/server/routes/teams/utils.test.ts
```

### [ ] C2. Remove retired public and stored type properties

**Depends on:** C1

**Files:**

- Modify `src/contracts/index.ts`
- Modify `src/server/db/schema.ts`

**Red check:** Run type-check after the runtime mapping changes and use a scoped
search to identify the remaining Location declarations. The only runtime gear
types allowed afterward are Team actionbook/checklist types.

**Implementation:** Remove camelCase equipment fields from `HikingLocationExtra`
and snake_case equipment fields from stored `LocationExtra.hiking`. Do not add a
deprecated or compatibility alias.

**Acceptance:**

- Public Location and stored Location JSON types expose neither retired field.
- Team checklist/actionbook contracts remain unchanged.
- All callers compile without casts added to production code.

**Verify:**

```bash
pnpm type-check
rg -n "gearEssential|gearOptional|gear_essential|gear_optional" \
  src/contracts/index.ts src/server/db/schema.ts src/server/routes/locations src/server/routes/teams
```

### Checkpoint C

```bash
pnpm lint
pnpm type-check
pnpm test:server
```

Expected result: the API boundary is discard-only for old input, strict for all
other input, and the Location domain has no equipment properties.

## Phase D: Existing Data

### [ ] D1. Add migration 0006 for Location JSON cleanup

**Depends on:** Checkpoint C

**Files:**

- Add `migrations/0006_remove_location_decision_info.sql`
- Modify `migrations/meta/_journal.json`
- Add `migrations/meta/0006_snapshot.json`
- Modify `scripts/reset-local-db.test.mjs`

**Red test:** Extend the local migration test to seed a Location `extra` value
containing both equipment paths plus unrelated nested/top-level JSON, apply
`0006`, and assert only the two paths disappear. Update the full-reset expected
migration count from 6 to 7. Run it before creating the migration.

**Implementation:** Use SQLite `json_remove` against
`$.hiking.gear_essential` and `$.hiking.gear_optional`, scoped to rows where at
least one path exists. Synchronize the journal and snapshot id chain without
changing the represented schema.

**Acceptance:**

- Both retired paths are absent after migration.
- Difficulty, route guidance, facilities, and arbitrary unrelated JSON survive.
- Tables, indexes, triggers, and foreign keys are unchanged.
- The chain contains ordered migrations `0000` through `0006`.

**Verify:**

```bash
pnpm test:db-reset
pnpm db:check
```

### Checkpoint D

Expected result: a clean local D1 reset applies seven migrations, existing data
is narrowly cleaned, and migration metadata is synchronized.

## Phase E: i18n Cleanup

### [ ] E1. Remove admin Location equipment translations

**Depends on:** B1

**Files:**

- Modify `public/locales/en/admin.json`
- Modify `public/locales/zh-CN/admin.json`
- Modify `public/locales/ja/admin.json`

**Implementation:** Delete `formDecisionTitle` and all `formGear*` keys. Keep
all other hiking/editor and Team-related language.

**Acceptance:** All three admin namespaces have the same reduced key set and no
retired Location form strings.

**Verify:**

```bash
pnpm i18n:validate
rg -n 'formDecisionTitle|formGear' public/locales/*/admin.json
```

### [ ] E2. Remove public decision, map-action, and gear translations

**Depends on:** A1, A2

**Files:**

- Modify `public/locales/en/locationDetail.json`
- Modify `public/locales/zh-CN/locationDetail.json`
- Modify `public/locales/ja/locationDetail.json`

**Implementation:** Delete the Location-only `decision`, `transport`, and
`gear` subtrees. Preserve route summary, tips, metrics, image controls, and team
discovery strings.

**Acceptance:** No public locale contains the deleted section, deleted map CTA,
or Location equipment language; all three locale shapes match.

**Verify:**

```bash
pnpm i18n:validate
rg -n '"decision"|"transport"|"gear"|openInMap|fallbackHint' \
  public/locales/*/locationDetail.json
```

### [ ] E3. Remove the shared Location label and regenerate artifacts

**Depends on:** E1, E2

**Files:**

- Modify `public/locales/en/common.json`
- Modify `public/locales/zh-CN/common.json`
- Modify `public/locales/ja/common.json`
- Regenerate `src/i18n/locales-data.ts`
- Regenerate `src/i18n/types.ts`

**Implementation:** Remove only `recommendedGear`, retain `precautions`, then
regenerate locale data and types with repository commands. Do not hand-edit the
generated files.

**Acceptance:** Source and generated locale shapes match; no generated retired
key remains; Team equipment keys remain generated and usable.

**Verify:**

```bash
pnpm i18n:build
pnpm i18n:gen-types
pnpm i18n:validate
pnpm type-check
```

### Checkpoint E

Expected result: Location-specific decision/equipment language is gone across
all three locales and generated artifacts, with Team language untouched.

## Phase F: Current Documentation

### [ ] F1. Document the reduced Location contract and migration baseline

**Depends on:** Checkpoints C, D, E

**Files:**

- Modify `docs/backend-api.md`
- Modify `docs/database.md`
- Modify `docs/frontend-pages.md`

**Implementation:** Record that Location hiking data retains route facts and
guidance but no equipment decision fields; document discard-only old input,
response omission, migration `0006`, and the absence of DecisionBlock/map action
and admin equipment inputs. Keep documentation as current-state reference, not a
historical execution plan.

**Acceptance:**

- API input/output behavior is explicit.
- Database migration baseline advances through `0006`.
- Frontend/admin behavior matches the implemented pages.
- Team actionbook equipment remains documented as a separate Team concept where
  already applicable.

**Verify:**

```bash
rg -n "0006|gear|equipment|装备|DecisionBlock|决策" \
  docs/backend-api.md docs/database.md docs/frontend-pages.md
git diff --check
```

### Checkpoint F

Expected result: all durable decisions live in the repository's current
authoritative docs rather than in a new permanent spec document.

## Phase G: Final Quality and Repository Hygiene

### [ ] G1. Run full gates and review the complete change

**Depends on:** Checkpoint F

**Files:** no planned production edits; findings may reopen the owning task

**Review:** Apply the repository code-review skill across behavior, security,
data integrity, accessibility, test quality, documentation, and scope. Resolve
all actionable in-scope findings and rerun affected focused checks.

**Verify:**

```bash
pnpm i18n:build
pnpm i18n:gen-types
pnpm i18n:validate
pnpm lint
pnpm type-check
pnpm test
pnpm test:server
pnpm test:db-reset
pnpm db:check
pnpm build
pnpm test:worker:run
git diff --check
```

**Acceptance:** Every command passes and review has no unresolved actionable
finding within the approved scope.

### [ ] G2. Prove boundaries and remove temporary task artifacts

**Depends on:** G1

**Files:**

- Delete `tasks/spec.md`
- Delete `tasks/plan.md`
- Delete `tasks/todo.md`

**Implementation:** Audit remaining equipment references and confirm they are
owned by Team checklist/actionbook behavior. Remove the one-off spec, plan, and
task files after their durable requirements have been reflected in tests and
current docs.

**Acceptance:**

- No Location UI, contract, storage, or documentation reference remains for the
  retired fields.
- Remaining `gearEssential` / `gearOptional` references are Team-only.
- Final diff contains no completed one-off plan/spec and no unrelated files.
- No secret, generated junk, remote operation, or production mutation appears.

**Verify:**

```bash
rg -n "gearEssential|gearOptional|gear_essential|gear_optional|DecisionBlock|recommendedGear|formGear|openInMap" \
  src public/locales migrations docs
git status --short
git diff --check
git diff --stat origin/main...HEAD
```

## Delivery Boundary

Task implementation begins only after explicit approval of this detailed
breakdown. Creating a pull request is a later delivery action; local production
deployment and remote D1 operations are never included.
