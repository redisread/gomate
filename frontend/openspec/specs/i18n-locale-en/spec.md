## Purpose

Defines requirements for the English locale translation files, ensuring complete key coverage, absence of residual Chinese characters, and contextual accuracy.

## Requirements

### Requirement: English locale files are complete
All 21 namespace JSON files under `public/locales/en/` SHALL contain English translations. No key shall contain Chinese characters (Unicode range U+4E00-U+9FFF).

#### Scenario: en locale has no Chinese characters
- **WHEN** all en JSON files are scanned for Chinese characters
- **THEN** zero keys contain values with Chinese characters

### Requirement: English locale covers all zh-CN keys
Every key present in `public/locales/zh-CN/{ns}.json` SHALL also exist in `public/locales/en/{ns}.json` with the same nested structure.

#### Scenario: en namespace key count matches zh-CN
- **WHEN** comparing key counts between zh-CN and en for each of the 21 namespaces
- **THEN** the number of keys in en equals the number of keys in zh-CN for each namespace

### Requirement: English translations are contextually accurate
Translated English text SHALL accurately reflect the meaning of the original Chinese text for user-facing content.

#### Scenario: team status enum values are translated correctly
- **WHEN** reading `en/enums.json` teamStatus values
- **THEN** "招募中" → "Recruiting", "已满员" → "Full", "已集结" → "Formed", "已完成" → "Completed", "已取消" → "Cancelled"
