## ADDED Requirements

### Requirement: Dynamic CORS origins from environment variable

The CORS allowed origins list SHALL be read from a single environment variable `CORS_ALLOWED_ORIGINS` containing a comma-separated string of allowed origins. The code SHALL parse this string at runtime to build the allowed origins list.

#### Scenario: Parse comma-separated origins
- **WHEN** the CORS middleware initializes
- **THEN** it splits `CORS_ALLOWED_ORIGINS` by comma and trims whitespace from each origin

#### Scenario: Include localhost origins in development
- **WHEN** running in local development (detected by host containing `localhost` or `127.0.0.1`)
- **THEN** `http://localhost:3000`, `http://localhost:4321`, `http://localhost:5432` are automatically added to the allowed origins list regardless of `CORS_ALLOWED_ORIGINS` value

#### Scenario: Private IP patterns always allowed
- **WHEN** a request origin matches private IP patterns (`192.168.x.x` or `10.x.x.x`)
- **THEN** the origin is allowed for mobile device debugging during local development

#### Scenario: No origin specified returns error
- **WHEN** `CORS_ALLOWED_ORIGINS` is not set and the request has an origin header
- **THEN** the middleware logs a warning and rejects the request (unless it matches localhost or private IP patterns in development)

### Requirement: Single source of CORS configuration

CORS allowed origins SHALL be defined in exactly one place: the `CORS_ALLOWED_ORIGINS` environment variable in `wrangler.toml`. No other source file SHALL contain a hardcoded list of allowed origins.

#### Scenario: CORS config exists only in cors.ts parsing logic
- **WHEN** searching the codebase for origin URLs
- **THEN** no hardcoded origin URLs exist outside of `wrangler.toml` and the parsing logic in `cors.ts`
