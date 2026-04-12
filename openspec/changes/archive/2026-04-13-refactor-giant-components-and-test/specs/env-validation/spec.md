## ADDED Requirements

### Requirement: Required environment variables check

The API SHALL validate all required environment variables at startup or first request. Missing critical variables SHALL result in a clear error response (HTTP 500) with a message indicating which variable is missing.

#### Scenario: AMAP_SERVER_KEY missing
- **WHEN** a request hits the amap route and AMAP_SERVER_KEY is not configured
- **THEN** the response SHALL be HTTP 500 with message "AMAP_SERVER_KEY not configured"

#### Scenario: R2_PUBLIC_URL missing
- **WHEN** a file upload succeeds but R2_PUBLIC_URL is not configured
- **THEN** the response SHALL be HTTP 500 with message "R2_PUBLIC_URL not configured"

### Requirement: Wrangler production vars completeness

The `wrangler.toml` `[env.production.vars]` section SHALL include all variables referenced in production code: APP_URL, FRONTEND_URL, R2_PUBLIC_URL, RESEND_FROM_EMAIL, CORS_ALLOWED_ORIGINS, and AMAP_SERVER_KEY.

#### Scenario: Production vars audit
- **WHEN** wrangler.toml is reviewed
- **THEN** all six production variables are present in `[env.production.vars]`
