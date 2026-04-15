## ADDED Requirements

### Requirement: API email templates support multiple locales
The system SHALL provide localized email templates for all outbound emails in zh-CN, en, and ja. Email content (subject, body HTML) SHALL be loaded from locale-specific JSON data files embedded in the API codebase.

#### Scenario: Send password reset email in user's locale
- **WHEN** a user requests password reset with locale set to "en"
- **THEN** the email subject is in English and the body HTML uses the English template

#### Scenario: Send password reset email with unknown locale
- **WHEN** a user requests password reset but no locale can be determined
- **THEN** the email falls back to zh-CN (default locale)

#### Scenario: Send welcome email in Japanese
- **WHEN** a new user registers with locale set to "ja"
- **THEN** the welcome email subject and body are in Japanese

### Requirement: Email sending functions accept locale parameter
Each email sending function (sendPasswordResetEmail, sendWelcomeEmail, sendContactFormEmail, sendFeedbackEmail) SHALL accept an optional `locale` parameter. When provided, the function SHALL load email content from the matching locale JSON file. When omitted, the function SHALL default to zh-CN.

#### Scenario: Call sendPasswordResetEmail with explicit locale
- **WHEN** sendPasswordResetEmail is called with locale="en"
- **THEN** the email is sent with English subject and HTML body

#### Scenario: Call sendWelcomeEmail without locale
- **WHEN** sendWelcomeEmail is called without a locale parameter
- **THEN** the email is sent with zh-CN content (default)

### Requirement: Locale-specific email content files exist
The API SHALL have three JSON files at `api/src/lib/locales/` named `email.zh-CN.json`, `email.en.json`, and `email.ja.json`. Each file SHALL contain all email template strings for that locale, organized by email type (passwordReset, welcome, contactForm, feedback).

#### Scenario: Load English email template
- **WHEN** the system loads email.en.json
- **THEN** it returns a JSON object with keys for all four email types in English

#### Scenario: Missing locale file defaults to zh-CN
- **WHEN** a requested locale JSON file fails to load
- **THEN** the system falls back to email.zh-CN.json

### Requirement: Callers extract locale from request cookie
Callers of email sending functions (auth.ts routes, teams.ts routes) SHALL extract the user's locale from the `gomate_locale` cookie in the incoming request and pass it to the email function.

#### Scenario: Auth route extracts locale for password reset
- **WHEN** the password reset route receives a request
- **THEN** it reads `gomate_locale` from request cookies and passes it to sendPasswordResetEmail

#### Scenario: Auth route extracts locale for welcome email
- **WHEN** the signup route completes registration
- **THEN** it reads `gomate_locale` from request cookies and passes it to sendWelcomeEmail
