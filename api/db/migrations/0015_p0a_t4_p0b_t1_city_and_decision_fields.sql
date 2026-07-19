-- Migration: task #164（P0-A T4）+ task #168（P0-B T1）合并
-- P0-A T4：users.city（用户所属城市，nullable，本地圈子/推荐位/季节 fallback）
-- P0-B T1：locations 4 决策信息字段（依据 spec §3.4-A / §5.4-A / §6）
--   - parking_available integer（boolean 三态：1=有 / 0=无 / null=信息缺失）
--   - parking_info text（停车信息，业务层 zod .max(100) 校验）
--   - gear_essential text（必带装备，comma-separated）
--   - gear_optional text（选带装备，comma-separated）
-- 
-- 规则：
--   1. 全部 nullable ADD COLUMN，无破坏性
--   2. 旧数据自动兼容（35 条 prod locations + N 条 users 全 null，前端 UI 按未填处理）
--   3. 无回填、无索引变更（业务层无 SQL 查询 city / parking 场景）
-- 
-- 原子性：ALTER TABLE ADD COLUMN 单语句天然原子；D1 逐条 apply 幂等（wrangler 已跟踪 idx）
-- 幂等：wrangler d1 migrations apply 幂等，重跑安全
-- 参考：db/migrations/0014_teams_checklist.sql（同 pattern 单字段 ADD COLUMN）
ALTER TABLE `locations` ADD `parking_available` integer;--> statement-breakpoint
ALTER TABLE `locations` ADD `parking_info` text;--> statement-breakpoint
ALTER TABLE `locations` ADD `gear_essential` text;--> statement-breakpoint
ALTER TABLE `locations` ADD `gear_optional` text;--> statement-breakpoint
ALTER TABLE `users` ADD `city` text;
