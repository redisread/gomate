## Purpose

Defines requirements for the Japanese locale translation files, ensuring complete key coverage, appropriate politeness level for Japanese UX conventions, and structural parity with zh-CN.

## Requirements

### Requirement: Japanese locale files are complete
All 21 namespace JSON files under `public/locales/ja/` SHALL contain Japanese translations. No key shall contain Chinese characters (Unicode range U+4E00-U+9FFF) unless the Japanese text legitimately uses kanji.

#### Scenario: ja locale translation is complete
- **WHEN** all ja JSON files are compared against zh-CN
- **THEN** no key has a value identical to the zh-CN counterpart (kanji may overlap but full phrases must differ)

### Requirement: Japanese locale covers all zh-CN keys
Every key present in `public/locales/zh-CN/{ns}.json` SHALL also exist in `public/locales/ja/{ns}.json` with the same nested structure.

#### Scenario: ja namespace key count matches zh-CN
- **WHEN** comparing key counts between zh-CN and ja for each of the 21 namespaces
- **THEN** the number of keys in ja equals the number of keys in zh-CN for each namespace

### Requirement: Japanese translations use appropriate politeness level
Translated Japanese text SHALL use desu/masu form (丁寧語) for UI elements and plain form for error messages, consistent with Japanese UX conventions.

#### Scenario: button labels use polite form
- **WHEN** reading ja locale files for button/label values
- **THEN** button labels end with polite forms (です/ます) or appropriate noun forms
