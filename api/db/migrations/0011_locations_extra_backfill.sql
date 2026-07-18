-- Migration: task #152 前置 —— locations.extra 回填主路线攻略内容 + 索引对齐
-- 背景：
--   1. #152 详情页「徒步攻略」区块改读 location.extra.hiking（Steven/Martin 2026-07-18 定稿，
--      选项 A：主路线 guide/extra 进 location，非主路线仅名称+参数已在 0010 附录中）
--   2. task #159 决策：schema 已声明但 DB 未建的 3 个索引随此迁移补齐（纯增量零数据风险）
-- 规则：
--   主路线 = MIN(created_at, rowid)（与 0010 同一规则）
--   extra.hiking = { overview, tips, equipmentNeeded, warnings }
--     overview = COALESCE(route_guide.overview, route.description)（保持今日 RouteInfoCard 显示语义）
--   合并而非覆盖：json_patch 进现有 extra（31/35 地点已有 facilities/tips/warnings 等键，全部保留）
--   无路线地点：extra 保持原值不动
-- 幂等：已存在 $.hiking 的地点跳过；索引 IF NOT EXISTS
-- 原子性：各语句独立原子（SQLite 单语句）；wrangler d1 migrations apply 逐文件应用

CREATE INDEX IF NOT EXISTS `locations_created_at_idx` ON `locations` (`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_title_idx` ON `teams` (`title`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `users_nickname_idx` ON `users` (`nickname`);
--> statement-breakpoint
UPDATE locations SET extra = json_patch(
  COALESCE(locations.extra, '{}'),
  (
    SELECT json_object(
      'hiking', json_object(
        'overview', COALESCE(json_extract(r.route_guide, '$.overview'), r.description),
        'tips', json_extract(r.route_guide, '$.tips'),
        'equipmentNeeded', json_extract(r.extra, '$.equipmentNeeded'),
        'warnings', json_extract(r.extra, '$.warnings')
      )
    )
    FROM routes r
    WHERE r.location_id = locations.id
    ORDER BY r.created_at ASC, r.rowid ASC
    LIMIT 1
  )
)
WHERE EXISTS (SELECT 1 FROM routes r WHERE r.location_id = locations.id)
  AND json_extract(COALESCE(locations.extra, '{}'), '$.hiking') IS NULL;
