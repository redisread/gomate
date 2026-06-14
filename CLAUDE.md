# GoMate

## Project

GoMate is a minimal "location-based team-up" platform. Users discover places, create or join teams, and coordinate trips with lightweight social proof and sharing flows.

## Stack

Monorepo managed by pnpm.

```text
gomate/
├── api/          # Hono + Cloudflare Workers + D1 + Drizzle
├── frontend/     # Astro 6 SSR + React 18 islands + Tailwind CSS 4
├── packages/
│   ├── types/    # shared TypeScript types
│   └── config/   # shared tsconfig
└── docs/         # feature/API documentation
```

Mobile code lives in `redisread/gomate-mobile`; do not add mobile implementation back into this repo.

## Commands

```bash
pnpm install
pnpm dev
pnpm api:dev
pnpm web:dev
pnpm type-check
pnpm lint
pnpm i18n:build
pnpm i18n:validate
pnpm --filter @gomate/api test
pnpm --filter @gomate/frontend test
pnpm --filter @gomate/frontend build
```

Runtime versions:

- Node: read from root `package.json` engines (`>=22.12.0`)
- pnpm: read from root `packageManager` / engines (`9.x`)

Local ports:

- API: `http://localhost:8799`
- Frontend: `http://localhost:5432`

Before starting dev servers, check existing processes:

```bash
lsof -ti:8799
lsof -ti:5432
```

## Deployment

Production:

- API Worker: `gomate-api` at `https://api.gomate.live`
- Frontend Worker: `gomate-frontend` at `https://gomate.live`
- R2 public URL: `https://gomate.cos.jiahongw.com`

GitHub Actions:

- `.github/workflows/api-deploy.yml`: deploys API on `api/**`
- `.github/workflows/frontend-deploy.yml`: deploys frontend on `frontend/**`, `packages/**`, or workflow changes
- `.github/workflows/pr-validation.yml`: API / Frontend / Mobile validation for PRs

Frontend deploy uses `frontend/wrangler.toml` and `@astrojs/cloudflare` v13 entrypoint:

```toml
main = "@astrojs/cloudflare/entrypoints/server"
```

Do not reintroduce Cloudflare Images binding unless explicitly requested. The Astro adapter should preserve passthrough/noop image behavior.

## Architecture Notes

API:

- Entry: `api/src/index.ts`
- Routes: `api/src/routes/`
- Database schema: `api/src/db/schema.ts`
- Auth: Better Auth in `api/src/lib/auth.ts`
- Storage: R2 helper in `api/src/lib/storage.ts`
- Team state logic: `api/src/lib/team-status.ts`

Frontend:

- Astro pages: `frontend/src/pages/`
- React islands: `frontend/src/components/features/`
- Layout: `frontend/src/layouts/Layout.astro`
- API client: `frontend/src/lib/api.ts`
- i18n data: `frontend/src/i18n/` and generated locale data
- Content collections: `frontend/src/content.config.ts`

Shared:

- Cross-package types: `packages/types/src/`
- Shared TypeScript config: `packages/config/`

## Data & Cloudflare

- D1 database binding: `DB`
- R2 binding: `R2`
- KV binding: `GOMATE_KV`
- API migrations live under `api/db/migrations`
- Local D1/R2 state lives under `.wrangler/state/`

Production database or data repair operations require explicit human authorization. Prefer migration files or documented SQL; do not run ad hoc production SQL without approval.

## i18n Rules

- User-facing copy should use the existing i18n system, not hardcoded strings.
- Run after locale changes:

```bash
pnpm i18n:build
pnpm --filter @gomate/frontend i18n:validate
```

- Keep namespace usage consistent. If a component uses `content.discover.*`, do not shorten it to `discover.*`.

## PR / Review Rules

Before asking for merge, provide:

- PR link
- changed files / scope
- local verification commands and results
- GitHub Checks status
- deployment impact
- rollback notes for risky changes

For frontend changes, minimum checks are usually:

```bash
pnpm i18n:build
pnpm --filter @gomate/frontend type-check
pnpm --filter @gomate/frontend build
```

For API changes, minimum checks are usually:

```bash
pnpm --filter @gomate/api lint
pnpm --filter @gomate/api type-check
pnpm --filter @gomate/api build
pnpm --filter @gomate/api test
```

After merge, verify production paths touched by the change. Do not treat build success as production validation.

## Known Gotchas

- Frontend is now Astro 6; old Astro 4 migration assumptions are stale.
- `@astrojs/cloudflare` v13 can introduce implicit bindings. Check generated Wrangler output before merging adapter changes.
- `session: false` is not a valid fix for Astro 6 session KV provisioning in this project.
- If deploy fails on KV namespace creation, inspect existing Cloudflare KV namespaces before changing code.
- Do not store test account passwords in `CLAUDE.md`. Use secure local notes or an authorized DM if credentials are needed.
- Frontend lint/test may be non-blocking in PR validation because of historical debt; type-check/build/i18n validation remain blocking.
- There may be unrelated worktree changes from other agents. Do not revert them.

## Documentation

Update docs when changing behavior:

- `docs/frontend-pages.md` for page/UI changes
- `docs/backend-api.md` for API request/response/auth changes
- `docs/font-subsetting.md` for font pipeline changes

Keep this file under 200 lines. Move long schemas, examples, and product docs to `docs/` or `.claude/rules/`.
