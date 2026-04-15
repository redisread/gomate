## ADDED Requirements

### Requirement: Upload component error messages use translation system
The cover image upload component (cover-image-upload.tsx) and multi-image upload component (multi-image-upload.tsx) SHALL use the i18n `t()` function for all user-visible text, including error messages, progress indicators, drag-drop prompts, and button labels. No hardcoded Chinese strings SHALL remain in these components.

#### Scenario: Display upload error in English
- **WHEN** a file upload fails and the user's locale is "en"
- **THEN** the error message is displayed in English (e.g., "Upload failed, please try again")

#### Scenario: Display upload progress with localized text
- **WHEN** a file is uploading and the user's locale is "ja"
- **THEN** the progress text (e.g., "アップロード中… 50%") is displayed in Japanese

#### Scenario: Display drag-drop prompt in current locale
- **WHEN** the upload area is shown and the user's locale is "en"
- **THEN** the drag-drop prompt text is displayed in English

### Requirement: FAQ content is fully translatable
The help/FAQ page (help-client.tsx) SHALL render FAQ items from translated data loaded via the i18n system. A new `help.json` namespace SHALL be created containing an array of FAQ items, each with `question` and `answer` fields. The component SHALL iterate over this array to render each FAQ entry.

#### Scenario: Display FAQ in English
- **WHEN** the help page is viewed with locale "en"
- **THEN** all 7 FAQ questions and answers are displayed in English

#### Scenario: Display FAQ in Japanese
- **WHEN** the help page is viewed with locale "ja"
- **THEN** all 7 FAQ questions and answers are displayed in Japanese

#### Scenario: FAQ fallback chain works
- **WHEN** a FAQ translation is missing for "ja"
- **THEN** the system falls back to "en", then to "zh-CN" per the existing fallback chain

### Requirement: Privacy and Terms page content is fully translatable
The privacy policy page (privacy-client.tsx) SHALL render all section titles, body text, and list items from translated data loaded via the i18n system. The existing `content.json` namespace SHALL be extended with `privacy` and `terms` sub-nodes. The component SHALL iterate over translated data structures to render each section.

#### Scenario: Display privacy policy in English
- **WHEN** the privacy page is viewed with locale "en"
- **THEN** all 7 privacy sections (titles, content, list items) are displayed in English

#### Scenario: Display privacy policy in Japanese
- **WHEN** the privacy page is viewed with locale "ja"
- **THEN** all 7 privacy sections are displayed in Japanese

### Requirement: No hardcoded Chinese strings remain in migrated components
After migration, the following files SHALL contain zero hardcoded Chinese user-visible strings:
- `frontend/src/components/ui/cover-image-upload.tsx`
- `frontend/src/components/ui/multi-image-upload.tsx`
- `frontend/src/components/features/help-client.tsx`
- `frontend/src/components/features/privacy-client.tsx`

#### Scenario: Grep verification finds no hardcoded Chinese
- **WHEN** searching for Chinese characters in the four migrated component files
- **THEN** no Chinese characters are found outside of `t()` function arguments or comments

### Requirement: New translation keys exist in all three locales
All new translation keys added for upload errors, FAQ items, and privacy/terms content SHALL have corresponding entries in zh-CN.json, en.json, and ja.json files. Missing translations in any locale SHALL trigger the existing dev-mode warning.

#### Scenario: Upload error key exists in all locales
- **WHEN** the key `ui.upload.uploadFailed` is looked up
- **THEN** it returns a translated string in zh-CN, en, and ja

#### Scenario: FAQ question key exists in all locales
- **WHEN** the key `help.faqItems[0].question` is looked up
- **THEN** it returns a translated string in zh-CN, en, and ja
