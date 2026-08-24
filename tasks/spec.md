# Spec: Retire Location Decision Information

## Objective

Retire location-level equipment decisions because they add editing and maintenance
cost without improving the location-detail experience. Administrators must no
longer enter required or optional location equipment, and visitors must not see a
"decision information" or recommended-equipment presentation derived from a
Location.

This change removes `gearEssential` / `gearOptional` from the Location domain and
deletes the entire location-detail DecisionBlock, including its "open in map"
action. It preserves hiking difficulty, duration, distance, elevation, overview,
tips, warnings, facilities, recommended activity types, unrelated map features,
and all Team actionbook equipment.

## Tech Stack

- Astro 7 SSR with React 18 islands and TypeScript 5.9
- Hono API routes with Zod 3 validation
- Drizzle schema backed by Cloudflare D1 / SQLite JSON columns
- Vitest for frontend and server tests; Playwright for browser E2E
- Repository i18n generation for English, Simplified Chinese, and Japanese

## Commands

```bash
# Generate and validate locale artifacts
pnpm i18n:build
pnpm i18n:gen-types
pnpm i18n:validate

# Static and focused behavior checks
pnpm lint
pnpm type-check
pnpm test
pnpm test:server
pnpm db:check

# Production-parity verification
pnpm build
pnpm test:worker:run
```

## Project Structure

```text
src/contracts/                         Public Location DTOs
src/server/db/schema.ts                Stored Location JSON type
src/server/routes/locations/           Location input and output mapping
src/server/routes/teams/               Embedded Location DTO mapping
src/components/features/location-form/ Admin location form model and sections
src/components/features/location-detail/ Public route and note UI
src/components/features/location-detail-client.tsx
                                       Location-detail composition
public/locales/{en,zh-CN,ja}/           Source translations
migrations/                            Ordered D1 data migrations
migrations/meta/                       Journal and snapshot chain
docs/                                  Current API, database, and page contracts
```

## Code Style

Keep the public and stored shapes explicit. Accept only the two retired input
keys as discard-only legacy input; continue rejecting every other unknown hiking
field.

```ts
const hikingExtraSchema = z
  .object({
    difficulty: difficultySchema.optional(),
    gearEssential: z.unknown().optional(),
    gearOptional: z.unknown().optional(),
  })
  .strict()
  .transform(({ gearEssential: _essential, gearOptional: _optional, ...hiking }) => hiking);
```

Do not add compatibility properties to DTOs or storage types. Use camelCase for
HTTP DTOs and snake_case only inside stored JSON. User-visible text must use the
existing i18n namespaces.

## Testing Strategy

1. Add or update server tests first so they fail while Location responses still
   expose equipment and while storage still accepts it.
2. Prove that create and update requests containing the two retired keys succeed,
   discard the values, and preserve all supported hiking fields.
3. Prove that unrelated unknown hiking keys still fail validation.
4. Update location-form tests to prove the form model and payload contain no
   location equipment fields.
5. Delete DecisionBlock and its tests; verify the location-detail composition no
   longer renders or imports the block.
6. Update route-info tests so tips and warnings remain visible while recommended
   location equipment cannot render.
7. Add a migration/reset assertion proving both stored JSON paths are removed and
   unrelated Location JSON values remain unchanged.
8. Run the full commands above before implementation is considered complete.

## Boundaries

### Always do

- Remove Location equipment from UI, form state, public contracts, storage types,
  API output mappers, and embedded Team Location DTOs.
- Delete the DecisionBlock map action together with the rest of that component;
  do not relocate it to another location-detail section.
- Add migration `0006` that removes `$.hiking.gear_essential` and
  `$.hiking.gear_optional` from every existing `locations.extra` value without
  changing other JSON content.
- Synchronize the migration journal/snapshot chain and current documentation.
- Preserve strict validation for every unknown field except the two explicitly
  retired discard-only input keys.

### Ask first

- Any removal beyond the two Location equipment fields.
- Any change to unrelated map features, route metrics, tips, warnings, or Team
  actionbook equipment.
- Any new dependency, CI configuration change, or production operation.

### Never do

- Rewrite an applied migration.
- Run a remote D1 migration or deploy from the local machine.
- Reintroduce a legacy DTO property or store a submitted retired equipment value.
- Remove Team checklist/actionbook gear fields, UI, contracts, or data.

## Success Criteria

1. No location page displays a section titled "Decision Information" or any
   Location-derived required/optional/recommended equipment.
2. The DecisionBlock and its "open in map" action are absent from the location
   detail page and are not recreated elsewhere.
3. The admin create/edit form has no location equipment section, requirement, or
   validation error.
4. Location DTOs and TypeScript storage types expose no `gearEssential`,
   `gearOptional`, `gear_essential`, or `gear_optional` properties.
5. Location and embedded Team Location API responses never emit retired equipment
   fields, even when pre-migration JSON still contains them.
6. Create/update requests containing only the two retired keys remain successful,
   but normalized storage omits them; other unknown hiking keys remain rejected.
7. Migration `0006` removes both JSON paths from all existing Location rows while
   preserving every unrelated field, table, index, and trigger.
8. Location route metrics, overview, tips, warnings, facilities, activities,
   unrelated map features, and Team actionbook equipment retain their current
   behavior.
9. Retired admin/location-detail i18n keys and obsolete components/tests are
   removed, generated locale data/types are synchronized, and current docs record
   the reduced Location model.
10. All listed verification commands pass with no unrelated worktree changes.

## Open Questions

None. The interview and assumption review explicitly approved the scope, data
cleanup, discard-only legacy input behavior, and out-of-scope boundaries.
