# Spec: admin-i18n-contract

状态：已批准（2026-08-25）

## Objective

为 GoMate 管理员界面建立语言无关、类型明确的展示合同，使内部枚举和 API 错误不能未经转换直接出现在 UI 中，并为 `admin-copy-experience` 提供唯一可复用的映射边界。

目标用户是使用中文、英文或日文管理地点、标签和用户权限的管理员。该模块只提供合同、翻译资源和错误分类，不负责逐页 UI 修复或浏览器验收。

### Canonical Terminology

| Concept | zh-CN | en | ja |
|---|---|---|---|
| location | 地点 | Location | スポット |
| region | 地区 | Region | 地域 |
| suitable activity types | 适合的活动类型 | Suitable activities | 適したアクティビティ |
| draft | 草稿 | Draft | 下書き |
| published | 已发布 | Published | 公開済み |
| archived | 已归档 | Archived | アーカイブ済み |
| user | 用户 | User | ユーザー |
| administrator | 管理员 | Administrator | 管理者 |
| active account | 正常 | Active | 有効 |
| suspended account | 已暂停 | Suspended | 一時停止 |
| banned account | 已封禁 | Banned | 利用停止 |
| deleted account | 已删除 | Deleted | 削除済み |

### Presentation Contract

1. `enums` namespace owns reusable domain values:
   - `userRole.user|admin`
   - `userStatus.active|suspended|banned|deleted`
   - `locationStatus.draft|published|archived`
   - `season.spring|summer|autumn|winter`
   - existing `locationType.*` remains the source for activity type labels
2. `admin` namespace owns administrator workflow copy, page copy, confirmations, and localized action errors.
3. Business content from D1 remains unchanged and is rendered as authored.
4. Enum-to-key mappings must be exhaustive at compile time against the public types in `src/contracts/enums.ts`.
5. Consumers must receive a translation key or translated string from the presentation boundary; raw enum identifiers are not a valid UI result.

### API Error Contract

The API remains locale-neutral. Actionable administrator conflicts expose a stable `error.details.reason`; message text remains diagnostic and must not be rendered by administrator UI.

The first supported reasons are:

| Reason | Source operation | Client copy intent |
|---|---|---|
| `admin_self_role_change` | change own role | current administrator cannot change own role |
| `admin_last_active_revoke` | revoke final active administrator | at least one active administrator must remain |
| `tag_already_exists` | create or rename tag | a tag with this identity already exists |
| `tag_update_conflict` | concurrent tag rename/update | tag changed; reload and retry |
| `location_changed_concurrently` | update/archive/delete location | location changed; reload and retry |
| `location_has_references` | permanent location deletion | historical references prevent deletion |
| `location_invalid_region` | create/update location | select an enabled city region |
| `location_image_host_disallowed` | create/update location | use an approved uploaded image URL |

Unknown, malformed, authorization, network, and server errors use a localized operation-specific fallback. The client helper must never return `error.message` or a top-level server message for administrator UI.

## Tech Stack

- TypeScript and Astro 5
- React 19 islands
- Hono API routes
- Existing JSON namespaces in `public/locales/{zh-CN,en,ja}`
- Generated `TranslationKey` union in `src/i18n/types.ts`
- Vitest 4 for client and server contract tests
- No new runtime or development dependencies

## Commands

```bash
pnpm i18n:build
pnpm i18n:gen-types
pnpm i18n:validate
pnpm lint
pnpm type-check
pnpm test
pnpm test:server
pnpm db:check
pnpm build
```

Focused verification during this module may use:

```bash
pnpm vitest run --config vitest.config.ts src/lib/admin-i18n.test.ts
pnpm vitest run --config vitest.server.config.ts src/server/routes/admin-users.test.ts src/server/routes/tags-management.test.ts
```

## Project Structure

```text
src/contracts/admin-i18n.ts
  Stable administrator error reasons and type guard.

src/lib/admin-i18n.ts
  Exhaustive enum translation-key maps and safe administrator error selection.

public/locales/{zh-CN,en,ja}/enums.json
  Shared role, status, location status, season, and activity labels.

public/locales/{zh-CN,en,ja}/admin.json
  Administrator workflow and action-error copy.

src/server/routes/admin-users.ts
src/server/routes/tags.ts
src/server/routes/locations/mutations.ts
  Attach stable reasons to the listed actionable errors.

src/lib/admin-i18n.test.ts
src/server/routes/*.test.ts
  Exhaustiveness, fallback, message-isolation, and route reason tests.
```

## Code Style

Use public contract unions and `satisfies` so additions fail type checking until translations are mapped. Do not add string compatibility fallbacks.

```ts
const USER_ROLE_KEY = {
  user: "enums.userRole.user",
  admin: "enums.userRole.admin",
} satisfies Record<UserRole, TranslationKey>;

export function userRoleKey(role: UserRole): TranslationKey {
  return USER_ROLE_KEY[role];
}
```

Error selection consumes untrusted payloads and returns only known translation keys or the caller-provided localized fallback:

```ts
export function adminActionErrorKey(payload: unknown): TranslationKey | null {
  const reason = readAdminErrorReason(payload);
  return reason ? ADMIN_ERROR_KEY[reason] : null;
}
```

Use lowercase snake_case for stable reason values. Keep mappings feature-owned in `src/lib/admin-i18n.ts`; do not add administrator-specific behavior to the generic API client.

## Testing Strategy

### Unit

- Every `UserRole`, `UserStatus`, `LocationStatus`, and supported season maps to an existing `TranslationKey`.
- Known administrator reasons map to the intended administrator translation key.
- Unknown, malformed, and message-only payloads return no key and cannot leak server text.
- Interpolation placeholders remain identical across all three locales.

### Server

- Each listed actionable branch returns its exact stable reason.
- Existing HTTP status and top-level API error code remain unchanged.
- Authorization, concurrency, and invariant tests continue to pass.

### Static

- `pnpm i18n:validate` proves locale key parity and namespace integrity.
- `pnpm i18n:gen-types` updates generated key types.
- `pnpm type-check` proves exhaustive enum mappings.

No browser tests are required for this provider module; browser acceptance belongs to `admin-i18n-guardrails` after UI consumers migrate.

## Boundaries

### Always

- Treat API payloads and reasons as untrusted input.
- Preserve existing HTTP statuses and top-level API error codes.
- Add the same keys and interpolation variables to all three locales.
- Use public types from `src/contracts`, not schema-layer duplicates.
- Add failing tests before changing contract behavior.
- Update `docs/backend-api.md` for new public reasons and `docs/frontend-pages.md` for the presentation boundary in the same final PR.

### Ask First

- Adding or removing a supported locale.
- Introducing a new dependency or translation service.
- Changing top-level API error codes or response envelope.
- Expanding the reason list beyond current administrator workflows.
- Moving unrelated public-page copy between namespaces.

### Never

- Localize API messages on the server.
- Render server `message` as administrator UI copy.
- Translate or mutate D1 business content.
- Add database schema or migration changes.
- Add permissive string aliases for old enum values.
- Edit generated i18n files by hand.

## Success Criteria

- Shared enum keys exist with natural `zh-CN`, `en`, and `ja` values.
- Enum maps are compile-time exhaustive over public contract unions.
- All eight listed administrator error reasons are stable contract values with a type guard.
- Listed server branches return the correct reason without changing their HTTP status or top-level error code.
- The safe client boundary ignores server message text and selects only known local translation keys or caller-provided localized fallback.
- Focused client/server tests pass, followed by the full command set above.
- No dependency, database, migration, or production configuration changes occur.

## Open Questions

None. Errors outside the eight actionable reasons deliberately use localized operation-specific fallback copy.
