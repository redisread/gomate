## ADDED Requirements

### Requirement: All user-visible hardcoded Chinese strings are migrated to i18n
The system SHALL ensure that all user-visible Chinese strings in frontend components are loaded through the i18n `t()` function. No hardcoded Chinese strings SHALL appear in user-facing UI text, including error messages, aria-labels, relative time displays, and decorative floating window labels.

#### Scenario: SeasonPicker displays localized season names
- **WHEN** a user views the season picker with locale "en"
- **THEN** season labels show English names (Spring, Summer, Autumn, Winter) and month ranges (Mar-May, etc.)

#### Scenario: SeasonPicker displays localized season names in Japanese
- **WHEN** a user views the season picker with locale "ja"
- **THEN** season labels show Japanese names and month ranges

#### Scenario: Upload error message displays in user's locale
- **WHEN** an image upload fails and locale is "en"
- **THEN** the error "上传失败" is replaced with "Upload failed" in English

#### Scenario: Map loading error displays in user's locale
- **WHEN** the map fails to load and locale is "en"
- **THEN** the error "地图加载失败，请检查网络" is displayed in English

#### Scenario: POI edit error displays in user's locale
- **WHEN** a POI creation fails and locale is "en"
- **THEN** the error "创建失败" is displayed in English

#### Scenario: Relative time display is localized
- **WHEN** a relative time is shown as "刚刚" and locale is "en"
- **THEN** it displays as "Just now" in English

#### Scenario: Unsaved changes warning is localized
- **WHEN** unsaved changes exist and locale is "en"
- **THEN** the warning "有未保存的更改" is displayed in English

#### Scenario: aria-label attributes are localized
- **WHEN** form-input password toggle is rendered and locale is "en"
- **THEN** aria-label shows "Show password" or "Hide password" in English

### Requirement: Email template translation data is valid in all locales
All email template JSON files (email.zh-CN.json, email.en.json, email.ja.json) SHALL contain valid translations with no residual Chinese characters in non-Chinese locales. Template variable placeholders SHALL be consistently formatted with proper spacing.

#### Scenario: Japanese welcome email contains no Chinese characters
- **WHEN** the Japanese welcome email template (email.ja.json welcome.feature3) is loaded
- **THEN** it contains only Japanese characters, no Chinese characters like "爱好者" or "出发"

#### Scenario: English greeting has proper spacing
- **WHEN** the English welcome email greeting is loaded
- **THEN** it reads "Hello {name}!" with a space before the placeholder

#### Scenario: Chinese greeting template has proper spacing
- **WHEN** the Chinese welcome email greeting is loaded
- **THEN** it reads "你好，{name}！" with proper punctuation and spacing

### Requirement: API email-i18n logs invalid locale usage
The email-i18n module SHALL log a warning when an invalid or unexpected locale is passed, while still falling back to zh-CN.

#### Scenario: Invalid locale triggers warning log
- **WHEN** getEmailField is called with an unrecognized locale
- **THEN** a warning is logged to console and zh-CN content is returned
