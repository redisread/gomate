# Plan: Retire Location Decision Information

## Outcome

Remove Location-level equipment decisions end to end: the public decision block
and its map action, route-guide equipment, admin form inputs, API and storage
properties, existing JSON data, translations, and obsolete tests. Preserve all
other Location guidance and every Team actionbook/checklist equipment feature.

## Implementation Approach

### 1. Remove presentation and editing surfaces first

Delete the complete Location `DecisionBlock` rather than leaving an empty or
renamed wrapper. Remove equipment from the route information card while keeping
metrics, overview, tips, and warnings. Remove the admin form section, state, and
payload fields together so no hidden or stale values can be submitted.

This phase changes only UI composition and form behavior. It deliberately does
not create a replacement map action.

### 2. Stop equipment at the server boundary

Update Location request normalization and response mapping before removing the
TypeScript properties. The request schema will retain exactly two discard-only
keys, `gearEssential` and `gearOptional`, inside the strict hiking object. A
transform removes them before normalization. This keeps old in-flight clients
from failing while ensuring the values are never stored.

Response mappers for both Location endpoints and Team-embedded Location DTOs
will omit stored `gear_essential` and `gear_optional` values immediately, even
before migration `0006` has run. Every other unknown hiking key remains invalid.

After all runtime readers and writers are gone, remove the retired properties
from the public contract and stored JSON type. This order keeps each checkpoint
type-correct and avoids a temporary compatibility model.

### 3. Clean existing data with an ordered migration

Add data migration `0006` using SQLite JSON functions to remove
`$.hiking.gear_essential` and `$.hiking.gear_optional` from `locations.extra`.
The update must preserve all unrelated JSON members and leave database objects
unchanged. Synchronize the Drizzle journal and snapshot chain as required by the
repository's migration checks.

No table, column, index, trigger, or binding changes are planned. No remote D1
command or deployment is part of this work.

### 4. Remove obsolete language and record the current contract

Delete only Location-specific equipment and decision translations from the
three source locales, then regenerate locale data and types. Team equipment
translations remain intact. Update the current API, database, and frontend page
documents with the reduced Location model and discard-only legacy-input rule.

### 5. Verify boundaries and remove temporary planning artifacts

Run focused tests at each checkpoint, then the repository's full quality gates.
Use scoped searches to prove that remaining gear references belong only to Team
features. After durable decisions exist in current docs and implementation
history, remove the one-off files under `tasks/` so the final tree follows the
repository documentation boundary.

## Dependency Graph

```text
Public detail UI -----------\
Route guidance UI ----------+--> server mapping --> public/storage types --> migration
Admin form -----------------/

UI removals --> locale cleanup --> generated i18n artifacts
All behavior and data tasks --> current docs --> full gates --> tasks/ cleanup
```

The three UI slices are independent, but they will be executed sequentially
because they share generated locale artifacts and final search results. Server
mapping must precede type removal. The migration may be authored independently,
but its verification follows the server behavior checkpoint.

## Checkpoints

1. **Public UI checkpoint:** DecisionBlock/map action and route equipment are
   absent; route metrics, tips, and warnings still pass focused tests.
2. **Admin checkpoint:** form model, validation, and payload have no Location
   equipment fields.
3. **Server checkpoint:** retired request keys are discarded, unknown keys are
   rejected, and Location responses cannot emit equipment.
4. **Data checkpoint:** migration tests remove only the two JSON paths and
   `pnpm db:check` passes.
5. **Language/docs checkpoint:** locale generation and validation pass; current
   docs describe the reduced model.
6. **Final checkpoint:** full repository gates pass, review finds no actionable
   issues, and no one-off task artifacts or unrelated changes remain.

## Risk Controls

| Risk | Control | Evidence |
| --- | --- | --- |
| Strict Zod validation rejects old clients | Keep exactly two discard-only `z.unknown().optional()` keys and transform them away | Server tests for accepted retired keys and rejected unrelated keys |
| Migration damages unrelated JSON | Update only rows containing the paths and assert retained nested/top-level values | Reset/migration test plus database checks |
| Location cleanup deletes Team gear | Scope edits by Location DTO/component paths and audit remaining references | Focused Team tests and final scoped `rg` review |
| Deleting DecisionBlock accidentally removes other maps | Remove only its import/render/component; do not touch other map components | Public composition test and final path search |
| Generated i18n files drift | Edit source locale JSON first, regenerate with project commands, validate namespaces | i18n build, generation, validation, and type-check |
| Data-only migration metadata becomes inconsistent | Generate/synchronize `0006` journal and snapshot with repository tooling | `pnpm db:check` and local reset test |

## Verification Strategy

Each behavior task begins with an assertion that fails against the preceding
implementation, followed by the smallest production change needed to pass it.
Focused test commands will be recorded in the detailed task breakdown. Final
verification is:

```bash
pnpm i18n:build
pnpm i18n:gen-types
pnpm i18n:validate
pnpm lint
pnpm type-check
pnpm test
pnpm test:server
pnpm db:check
pnpm build
pnpm test:worker:run
git diff --check
```

## Open Questions

None. The approved specification resolves the removal boundary, legacy-input
behavior, migration requirement, map-action behavior, and Team gear exclusion.
