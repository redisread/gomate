## ADDED Requirements

### Requirement: Centralized environment configuration

All environment-dependent configuration values SHALL be read from Cloudflare Workers environment variables (`c.env.*`) in the API code, and from `import.meta.env.*` in the frontend code. The single source of truth for each configuration value SHALL be defined in `wrangler.toml` `[vars]` and `[env.production.vars]` sections.

#### Scenario: Local development uses wrangler.toml vars
- **WHEN** developer runs `pnpm dev` or `wrangler dev`
- **THEN** all configuration values are read from `[vars]` section in `wrangler.toml` with sensible localhost defaults

#### Scenario: Production uses Cloudflare environment variables
- **WHEN** API is deployed to Cloudflare Workers
- **THEN** all configuration values are read from `[env.production.vars]` in `wrangler.toml` or Cloudflare Dashboard variable settings

### Requirement: API base URL configuration

The API base URL SHALL be configurable via `APP_URL` environment variable for the backend and `PUBLIC_API_URL` for the frontend. A localhost fallback SHALL be preserved for local development only.

#### Scenario: Backend reads APP_URL from env
- **WHEN** backend code needs the API base URL (e.g., auth callback URLs)
- **THEN** it reads `c.env.APP_URL` with fallback to `"http://localhost:8799"` for local development

#### Scenario: Frontend reads PUBLIC_API_URL from env
- **WHEN** frontend code makes API calls
- **THEN** it reads `import.meta.env.PUBLIC_API_URL` with fallback to `"http://localhost:8799"` for local development

### Requirement: R2 public URL configuration

The R2 public URL SHALL be read exclusively from `R2_PUBLIC_URL` environment variable. No hardcoded fallback URL SHALL exist in source code.

#### Scenario: Upload route returns correct public URL
- **WHEN** a file is uploaded to R2
- **THEN** the returned public URL comes from `c.env.R2_PUBLIC_URL`

#### Scenario: Missing R2_PUBLIC_URL in production returns error
- **WHEN** `R2_PUBLIC_URL` is not set in production environment
- **THEN** the upload endpoint returns a 500 error with a clear message indicating the missing environment variable

### Requirement: Better Auth trusted origins from environment

The Better Auth `trustedOrigins` list SHALL be constructed from `APP_URL` and `FRONTEND_URL` environment variables, not hardcoded in source code. Localhost entries SHALL be automatically included when running in development mode.

#### Scenario: Production trusted origins from env vars
- **WHEN** Better Auth initializes in production
- **THEN** `trustedOrigins` contains the values of `APP_URL` and `FRONTEND_URL` from environment variables

#### Scenario: Development includes localhost origins
- **WHEN** Better Auth initializes in local development
- **THEN** `trustedOrigins` includes localhost entries in addition to any configured URLs
