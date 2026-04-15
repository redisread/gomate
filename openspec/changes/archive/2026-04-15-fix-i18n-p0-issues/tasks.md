## 1. 补全缺失翻译

- [x] 1.1 在 `en/teams.json` 中添加 `approveUserJoined` 和 `rejectUserCannotJoin` 翻译
- [x] 1.2 在 `ja/teams.json` 中添加 `approveUserJoined` 和 `rejectUserCannotJoin` 翻译
- [x] 1.3 运行 `node scripts/validate-i18n-keys.mjs` 验证 key 一致性通过

## 2. 修复 t() 调用 bug

- [x] 2.1 修复 `profile-form-fields.tsx` 中 `(t('enums.gender') as any).male` 改为 `t('enums.gender.male')`
- [x] 2.2 确认 `enums.json` 中存在 `gender.male` 和 `gender.female` 的 key 路径

## 3. 补全页面 namespace 声明

- [x] 3.1 在 `about.astro` 中添加 `declareI18nNs(Astro.locals, ['nav', 'content'])`
- [x] 3.2 在 `help.astro` 中添加 `declareI18nNs(Astro.locals, ['nav', 'content'])`
- [x] 3.3 在 `privacy.astro` 中添加 `declareI18nNs(Astro.locals, ['nav', 'content'])`
- [x] 3.4 在 `terms.astro` 中添加 `declareI18nNs(Astro.locals, ['nav', 'content'])`

## 4. blog/index.astro i18n 改造

- [x] 4.1 在 `blog/index.astro` 中添加 `declareI18nNs` 声明
- [x] 4.2 创建 `blog` namespace 的 JSON 文件（zh-CN, en, ja）
- [x] 4.3 将 `blog/index.astro` 中的硬编码中文替换为 `ssr.t()` 调用
- [x] 4.4 运行类型检查确认无错误

## 5. CI 集成校验脚本

- [x] 5.1 在 `package.json` 中添加 `i18n:validate` 脚本命令
- [x] 5.2 在 CI 配置中添加 i18n 校验步骤
