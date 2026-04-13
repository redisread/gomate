## Context

`use-team-detail.ts:76` 声明加载 `["teams", "success", "errors", "common"]` 四个 namespace，其中 `success` namespace 不存在对应 JSON 文件，i18n 系统尝试请求 `/locales/{lang}/success.json` 返回 404。

当前使用 `t('success.applied')` 等 key 的 4 处调用全部与队伍操作相关（申请加入、退出队伍、批准/拒绝申请）。

## Goals / Non-Goals

**Goals:**
- 消除 `success.json` 404 错误
- 将成功提示文案归入正确的 namespace（teams）

**Non-Goals:**
- 不创建通用的 success namespace（这些 key 只在队伍场景使用）
- 不修改其他文件的 namespace 声明

## Decisions

将 4 个 key 直接放入 `teams.json`，key 名保持 `applied`、`leftTeam`、`approved`、`rejected`（去掉 `success.` 前缀），使用 `t('teams.applied')` 调用。

**理由：** 这些文案语义上属于队伍操作成功提示，与 `teams.formTeamSuccess`、`teams.deleteTeamSuccess` 属于同一类。teams.json 已包含类似的成功提示，保持归属一致。

## Risks / Trade-offs

- **无风险**：仅修改 3 个 locale 文件和 1 个 TS 文件，改动范围极小
