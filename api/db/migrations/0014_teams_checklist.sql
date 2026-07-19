-- Migration: task #163（P0-A T1）—— teams 加 checklist 字段（Team「行动本」）
-- spec：notes/gomate-p0a-team-actionbook-spec.md v1.1 §2
-- 规则：
--   1. checklist 是 TEXT nullable，存 JSON（drizzle $type<TeamChecklist>）
--   2. nullable 语义 = 队长未填；非空 = 完整 JSON 结构
--   3. 单字段 <2KB，不建索引（无 SQL 层查询需求，业务层 parse JSON）
-- 原子性：ALTER TABLE ADD COLUMN 单语句天然原子
-- 幂等：wrangler d1 migrations apply 已跟踪 idx，重跑安全
ALTER TABLE `teams` ADD `checklist` text;
