## Why

`use-team-detail.ts` 声明了加载 `success` namespace，但项目中不存在 `success.json` 翻译文件，导致开发服务器产生 404 错误。该 namespace 下的 4 个翻译 key（`applied`、`leftTeam`、``approved`、`rejected`）全部属于队伍操作场景，应归入 `teams.json`。

## What Changes

- 将 4 个 success 提示文案添加到 `teams.json`（zh-CN/en/ja）
- 更新 `use-team-detail.ts` 的 namespace 声明，移除 `success`，使用 `teams.applied` 等 key
- 更新 `i18n/types.ts` 类型定义

## Capabilities

### New Capabilities
<!-- 无新功能，纯 bug 修复 -->

### Modified Capabilities
<!-- 无 spec 变更 -->

## Impact

- `frontend/public/locales/{zh-CN,en,ja}/teams.json` — 新增 4 个 key
- `frontend/src/components/features/team-detail/use-team-detail.ts` — 修改 4 处 t() 调用
- `frontend/src/i18n/types.ts` — 更新类型定义（如果引用了 `success.*`）
