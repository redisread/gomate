## ADDED Requirements

### Requirement: ESLint configuration

The project SHALL have ESLint configured with TypeScript support, enforcing consistent code style across all TypeScript and TypeScript React files.

#### Scenario: ESLint runs successfully
- **WHEN** `pnpm lint` is executed
- **THEN** ESLint SHALL check all `.ts` and `.tsx` files and report zero errors

#### Scenario: ESLint catches style violations
- **WHEN** a file contains a style violation (e.g., unused variable, missing semicolon)
- **THEN** ESLint SHALL report the specific rule, file, line, and column

### Requirement: Lint script in each package

Each package (api, frontend) SHALL have a `lint` script in its package.json that runs ESLint on its source files.

#### Scenario: API lint
- **WHEN** `pnpm --filter @gomate/api lint` runs
- **THEN** ESLint checks all files in `api/src/`

#### Scenario: Frontend lint
- **WHEN** `pnpm --filter @gomate/frontend lint` runs
- **THEN** ESLint checks all files in `frontend/src/`
