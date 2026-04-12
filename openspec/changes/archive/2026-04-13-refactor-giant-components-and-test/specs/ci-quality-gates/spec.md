## ADDED Requirements

### Requirement: API deployment includes test gate

The API CI/CD pipeline SHALL run tests before deployment. Deployment SHALL only proceed if all tests pass.

#### Scenario: Tests pass
- **WHEN** API code is pushed to main
- **THEN** CI runs type-check, lint, and tests, and only deploys if all pass

#### Scenario: Tests fail
- **WHEN** any test fails in the API pipeline
- **THEN** the deployment step SHALL be skipped and the pipeline SHALL report failure

### Requirement: Frontend deployment includes test gate

The frontend CI/CD pipeline SHALL run tests before deployment, in addition to the existing type-check and build steps.

#### Scenario: Tests pass
- **WHEN** frontend code is pushed to main
- **THEN** CI runs type-check, tests, and build, and only deploys if all pass

#### Scenario: Tests fail
- **WHEN** any test fails in the frontend pipeline
- **THEN** the deployment step SHALL be skipped and the pipeline SHALL report failure
