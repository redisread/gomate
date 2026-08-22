## 目的

<!-- 一句话说明为什么改、解决什么问题。 -->

## 改动一览

| 模块           | 改动                                                |
| -------------- | --------------------------------------------------- |
| Unified Worker | <!-- Astro / Hono / bindings / routes -->           |
| Database       | <!-- schema / migration / seed / query contract --> |
| Product        | <!-- frontend / API / i18n -->                      |
| Delivery       | <!-- local tooling / docs -->                       |

## 破坏性变更

- [ ] 无破坏性变更
- [ ] 有破坏性变更，已在下方说明数据、API 和部署影响

<!-- 不提供兼容层时，请明确删除的 endpoint、字段、表或运行方式。 -->

## 验证证据

- [ ] `pnpm test:ci`
- [ ] `pnpm worker:types && pnpm worker:dry-run && pnpm worker:size`
- [ ] `pnpm test:e2e:ci`
- [ ] 生产发布（如适用）仅由受保护 Workers Builds 执行 `pnpm deploy:production`

补充手动验证：

<!-- 列出真实执行的步骤、结果和未执行项；不要用推断替代证据。 -->

## Cloudflare / 数据库影响

- 远程 D1/KV/R2/secret/route/deploy 是否变化：
- migration 是否可在全新 D1 重放：
- production route 是否仍保持 fail-closed：
- 流水线重构前是否需要保持生产写入冻结：

## UI 验证

- [ ] 不涉及用户界面
- [ ] Chrome 桌面端与移动端关键流程已验证
- [ ] Lighthouse accessibility / performance 未退化或差异已说明
- [ ] i18n 三种语言 key 已生成并校验

## 回滚路径

<!-- 说明代码、Worker route 和 D1 binding 的独立回滚步骤。禁止用 git reset --hard 作为协作分支回滚方案。 -->

## 关联

- Spec / ADR：
- Issue / task：
- 上下游：
