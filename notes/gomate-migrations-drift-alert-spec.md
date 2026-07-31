# gomate D1 账本一致性告警 v1.1（规约第 4 条）

> 制定：@Karis（DevOps 规约 + CI 实施），Martin CR + Victor 授权，2026-08 启动。
> 背景：v1.0 规约三条款（#452 双账本同步、#453 staging SOP、#456 schema.ts 同步门禁）已落地；v1.1 第 4 条针对**远端 D1 实际状态**漂移——v1.0 只能抓 PR 阶段的 schema 漂移，但「已经应用但在 schema/journal 外」的漂移（如手工 `wrangler d1 execute` 或历史事故）只能在运行时观察。
> 任务编号：#234。

## 一、问题域

### 当前盲点（v1.0 规约未覆盖）

- v1.0 三条款仅在 PR/合并阶段校验——任何 deploy 之后的远端漂移（如 prod D1 已应用 N 条 migration，但本仓 `_journal.json` 只有 M 条，**M < N**）无法发现
- 历史事故实证：#202/#451 期间曾出现「账本漂移靠 Wen 事后 prod curl 发现」模式——漂移不可观测时间窗达数小时

### 与 v1.0 条款的边界

| 条款 | 触发时机 | 拦截层级 | 漂移捕获范围 |
|---|---|---|---|
| #452 双账本 | PR merge 前 | CI 红 → 阻塞合并 | `.sql ↔ _journal.json` 文件层 |
| #456 schema.ts | PR merge 前 | CI 红 → 阻塞合并 | live 表 ↔ schema.ts 定义 |
| **v1.1 第 4 条** | **deploy 前置 + 定时** | **告警 + abort deploy** | **远端 D1 `d1_migrations` ↔ 本地 `_journal.json`** |

不重叠，三层覆盖完整漂移链路。

## 二、告警源

**对比两边账本条目数**：
- **远端**：`SELECT COUNT(*) FROM d1_migrations`（wrangler d1 表，pipeline 写入；不是 drizzle `_journal`）
- **本地**：`api/db/migrations/meta/_journal.json` 的 `entries.length`

**漂移判定**：`diff = remote_count - journal_count`

| diff 含义 | 状态 | 动作 |
|---|---|---|
| `diff === 0` | 正常 | 无动作 |
| `diff > 0`（远端多） | **stale drift**（手工 execute 未补 migration 文件） | 告警 + 提示「需补 migration + journal entry」（按规约 v1.0 规则 5 急救 SOP） |
| `diff < 0`（本地多） | **future drift**（migration 文件已写但未应用） | 告警 + 提示「合并后 pipeline 未跑或失败」 |
| 两边表都无法访问 | 通讯异常 | 静默 skip，定时下次重试 |

## 三、采集方式

### 双轨

1. **deploy 前置 check**（关键）：
   - 在 `.github/workflows/api-deploy.yml` 与 `deploy-staging.yml` 的「Apply D1 migrations」步骤**之前**插入新 step「Drift Check」
   - 漂移非 0 → exit 1 → **abort deploy**（不动 wrangler，不更新 Worker version）
   - 漂移 0 → 继续 deploy
   - **必须**：abort 不写任何资源（不写 GitHub artifact、不发告警消息——避免告警风暴）

2. **每日定时 schedule**（兜底）：
   - 新 workflow `.github/workflows/d1-drift-alert-cron.yml`
   - 每日北京时间 03:00（UTC 19:00，避开整点高负载）
   - 仅 staging：prod 漂移频次极低、变更频次低，先在 staging 跑稳再扩 prod
   - **首次发现发送告警 + 持续 >24h 升级到 daily digest**（避免噪声淹没频道）

### 不在 PR 门禁

**重要边界**：本告警**不**接 PR 阶段门禁。理由：
- PR 阶段用 v1.0 三条款拦截（#452/#456），重复加只会延迟 CI
- drift 经常因「上次 deploy 失败」产生，PR 阶段看不到（deploy 已合并的版本 + 未应用）
- drift 也经常因「prod 手工 execute」产生，与 PR 内容无关

## 四、告警通道

### 格式

```
[STAGING 漂移告警] 2026-08-01T03:00:00+08:00
journal=N, d1_migrations=M, diff=K
status: stale | future
action: 需补 migration + journal entry / 检查 deploy 状态
links: <inspect URL>
```

### 渠道

- 发送至 `#proj-gomate` 频道（统一事故通讯）
- 首条即时发送；之后 24h 静默窗口（避免同 drift 多次推送）
- 持续 >24h 升级：合并为 daily digest（一次/d，含累计漂移数 + 上次 drift 时间）

### 不发的渠道

- ❌ **不发到 prod user**：漂移是运维问题，不影响用户功能（数据库可正常读写）
- ❌ **不发到 GitHub commit status**：drift 不阻断 PR，且 PR 阶段无 drift 数据
- ❌ **不发 PR 评论**：drift 与具体 PR 无关

## 五、任务边界（严守）

按 Martin 派工确认：

- ✅ 不动 v1.0 三条款（#452 双账本 / #453 staging SOP / #456 schema.ts 同步门禁）
- ✅ 不改 `api/scripts/check-migrations-sync.mjs` 现有逻辑
- ✅ 不动 D1 schema（账本表 `d1_migrations` 是 wrangler 自带，不动 DDL）
- ✅ 新代码只在 `api/scripts/` + `.github/workflows/` 目录

### 新增文件清单（预计）

- `api/scripts/check-migrations-drift.mjs`（新脚本，对比 remote vs journal）
- `.github/workflows/d1-drift-alert-cron.yml`（新定时 workflow）
- 修改 `.github/workflows/api-deploy.yml`（加前置 check step）
- 修改 `.github/workflows/deploy-staging.yml`（加前置 check step）
- `docs/prod-change-policy.md` 新增章节（v1.1 第 4 条）

## 六、与已有脚本的关系

`api/scripts/check-migrations-sync.mjs`（#452/#456）只读本地文件——是**PR 阶段门禁**。
新 `check-migrations-drift.mjs` 读**远端 D1 + 本地 journal**——是**deploy 阶段 + 定时告警**。

两者职责清晰，无重叠。deploy 阶段 abort 等同 v1.0「rollback lineage」延伸：**漂移 = 不能信任当前 prod 状态 → 不允许新 deploy 上去扩大不一致**。

## 七、验证规格

### 负向实证（必跑）

1. **手工漂移制造**：
   - 在 staging 手工 `wrangler d1 execute --remote --env staging "CREATE TABLE test_drift_xxx (id INTEGER)"`
   - 不补 migration / journal entry
   - 触发 drift check → 应告警「stale drift, diff=+1」

2. **deploy 阻断**：
   - 手工 drift 存在时触发 staging deploy → deploy 应 fail 在 drift check step，后续步骤不执行

3. **24h digest 升级**：
   - drift 存在 24h 后再触发 cron → 应发 daily digest（不是即时告警）

### 正向实证（必跑）

1. 干净 staging（journal 与 d1_migrations 数一致）→ deploy 正常过
2. 干净 staging → cron 运行 → 仅日志「无漂移」，不发频道消息
3. drift check fail 后手工补 migration + journal → 下次 deploy 应过

### 边界实证（必跑）

1. 匿名无 drift 数据（远端不可达）→ 静默 skip，无告警
2. journal 与 d1_migrations 同为 0（空库）→ 无漂移
3. `_journal.json` 缺文件（被删）→ check 报错但**不**作为漂移（这是 v1.0 #452 职责）

## 八、验收清单

- [ ] spec CR PASS（Martin）
- [ ] `check-migrations-drift.mjs` 落地（负向 + 正向 + 边界三组实证）
- [ ] staging 定时 workflow 上线
- [ ] deploy 前置 check 在 api-deploy.yml + deploy-staging.yml 生效
- [ ] docs/prod-change-policy.md v1.1 章节加入
- [ ] prod 漂移频次观察 2 周后决定是否扩 prod 范围

## 九、open question

1. **告警内容是否包含具体漂移表名/字段**？（会泄露内部 schema 给频道所有人）
   - 默认：不包含，只给计数与 diff 状态
   - 排查需要时再回 d1 inspect URL

2. **远端查询走 OAuth 还是 service token**？
   - 默认：OAuth（与 v1.0 手动 d1 操作一致），token 复用 gomate CI 服务账号

3. **daily digest 持续多久停止发送**？
   - 默认：drift 被人工修复（journal 追上）即停；否则持续每日提醒