# Single Worker + Database V2 execution plan

Source of truth: `notes/single-worker-db-v2-refactor-spec.md`

## Phase 0 — design gate

- [x] Inventory current Workers, routes, bindings, schema, migrations and MCP/API Key surface.
- [x] Establish destructive migration assumptions and production boundary.
- [x] Write architecture, data, deletion, delivery and rollback design.
- [x] Complete three independent design reviews and resolve all blockers.

## Phase 1 — database baseline

- [ ] Write failing schema/invariant/migration replay tests.
- [ ] Replace Drizzle schema with the 19-table V2 model.
- [ ] Replace historical migrations with `0000_init.sql` and six triggers.
- [ ] Replace seed/reset/integrity scripts with V2 versions.
- [ ] Pass same-DB idempotent replay, two workerd ledger replays, FK, trigger, cascade, `db.batch` rollback and query-plan tests.

## Phase 2 — remove MCP and API Key

- [ ] Delete MCP workspace and public `/v1` routes.
- [ ] Remove API Key auth plugin, routes, audit/idempotency-only code and dependencies.
- [ ] Remove settings UI, navigation, locales and v1/API Key tests.
- [ ] Prove removed endpoints are unavailable and executable references are zero.

## Phase 3 — application adaptation

- [ ] Adapt auth and users.extra.
- [ ] Replace cities with regions and adapt locations/tags.
- [ ] Adapt teams, join requests, active members and derived lifecycle.
- [ ] Merge activity posts into stories and adapt likes/tags.
- [ ] Split favorites and adapt messages.
- [ ] Move image/business cache to KV and adapt local-circle/share image.
- [ ] Update frontend calls, forms, response types and tests to the new contracts.

## Phase 4 — one Worker

- [ ] Extract importable API app.
- [ ] Add Hono API + official `@astrojs/cloudflare/handler` Worker entrypoint and explicit JSON API fallback.
- [ ] Add one Wrangler JSONC with D1/R2/CACHE_KV/ASSETS; auth remains D1-only.
- [ ] Move auth to `/api/auth`, remove cross-origin configuration and use same-origin clients.
- [ ] Replace two-server local workflow with one workerd server.
- [ ] Remove resvg WASM and enforce Worker size budget.

## Phase 5 — delivery

- [ ] Delete unsafe legacy auto-deploy workflows and add fail-closed manual unified deployment.
- [ ] Update backend API, database schema, frontend pages, local-dev and prod-change docs.
- [ ] Run all static, unit, integration, migration, build, dry-run and E2E checks.
- [ ] Run GoMate pre-merge review plus focused Worker and DB reviews; resolve findings.
- [ ] Commit intentional increments, push `codex/unify-worker-db-v2`, and open a draft PR.

## Production boundary

- Never create/modify remote D1, KV, Worker routes, secrets or deployments in this task.
- The PR documents a separately approved first-production rollout and rollback.
