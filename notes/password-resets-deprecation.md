# password_resets 退役记录

## 结论

`password_resets` 是旧认证实现遗留表。当前密码重置由 Better Auth 的 `verifications` 表承载；仓库业务代码没有对 `password_resets` 的读写，只有 Drizzle 映射和测试建表仍保留。

本轮采用 expand/contract 的退役方式：先把表标记为 deprecated，不直接在完整性迁移中删除。原因是仓库静态检索只能证明当前代码未使用，不能证明生产库没有历史数据，也不能排除尚未升级的调用方。

## Contract 阶段准入条件

删除 `password_resets` 前必须同时满足：

1. 生产 D1 执行只读核验，确认表中没有未过期且未使用的记录；
2. 至少经过一个正常发布观察窗口，认证日志中没有访问该表的错误；
3. 获得生产变更显式批准；
4. 用独立 migration `DROP TABLE IF EXISTS password_resets`，并同步删除 `schema.ts` 映射和测试建表；
5. 验证忘记密码、重置密码以及迁移全量重放。

## 回滚

Contract migration 合并前无需回滚：旧表仍保持原状。删除后如发现兼容调用，先通过新 migration 恢复表结构，再回滚调用方；不要修改已应用 migration。
