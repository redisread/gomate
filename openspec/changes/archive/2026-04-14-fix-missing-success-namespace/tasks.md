## 1. 翻译文件更新

- [x] 1.1 在 `zh-CN/teams.json` 添加 4 个 success 提示 key：`applied`、`leftTeam`、`approved`、`rejected`
- [x] 1.2 在 `en/teams.json` 添加对应的英文翻译
- [x] 1.3 在 `ja/teams.json` 添加对应的日文翻译（与 zh-CN 相同，待后续翻译）

## 2. 代码更新

- [x] 2.1 更新 `use-team-detail.ts`：移除 `success` namespace，将 `t('success.xxx')` 改为 `t('teams.xxx')`
- [x] 2.2 更新 `i18n/types.ts`：移除 `success.*` 类型引用（无需修改，不存在相关引用）
