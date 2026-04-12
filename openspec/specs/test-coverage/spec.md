## ADDED Requirements

### Requirement: Backend integration test coverage

All API route files SHALL have corresponding integration tests covering the happy path, error cases, and edge cases.

#### Scenario: Upload route tests
- **WHEN** integration tests run
- **THEN** upload.ts SHALL be tested for: avatar upload success, file type validation, file size limit, unauthorized access, and R2 not configured

#### Scenario: POI route tests
- **WHEN** integration tests run
- **THEN** pois.ts SHALL be tested for: CRUD operations, search, authorization, and not found cases

#### Scenario: Admin route tests
- **WHEN** integration tests run
- **THEN** admin.ts SHALL be tested for: admin-only access, non-admin rejection, and successful admin operations

### Requirement: API client unit tests

The frontend API client (`frontend/src/lib/api.ts`) SHALL have unit tests covering all HTTP methods and error handling.

#### Scenario: fetchAPI wraps requests correctly
- **WHEN** fetchAPI is called with a path and options
- **THEN** it SHALL prepend the correct API base URL and include credentials

#### Scenario: apiGet handles errors
- **WHEN** apiGet receives a non-OK response
- **THEN** it SHALL throw an error with the path and status code

### Requirement: CI coverage threshold

The CI pipeline SHALL enforce a minimum test coverage threshold of 60% for the API and 40% for the frontend.

#### Scenario: Coverage check passes
- **WHEN** API tests complete
- **THEN** coverage SHALL be >= 60% or the CI job fails

#### Scenario: Coverage check passes for frontend
- **WHEN** Frontend tests complete
- **THEN** coverage SHALL be >= 40% or the CI job fails
