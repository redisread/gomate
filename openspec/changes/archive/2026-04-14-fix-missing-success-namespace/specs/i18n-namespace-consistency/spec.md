## ADDED Requirements

<!-- 本次为纯 bug 修复，不引入新的 capability 或 spec 变更 -->

### Requirement: i18n namespace consistency

The system SHALL NOT produce 404 errors when loading translation namespaces that are declared but have no corresponding JSON file.

#### Scenario: use-team-detail loads translations
- **WHEN** `use-team-detail.ts` initializes i18n with namespace list
- **THEN** all declared namespaces must have corresponding JSON files in `public/locales/{lang}/`
