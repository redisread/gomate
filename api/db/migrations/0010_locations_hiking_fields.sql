-- Migration: task #151 简化 Phase 1 —— locations 扁平化徒步参数 + 主路线回填
-- 规则（Martin/Steven 2026-07-18 定稿，见 notes/gomate-simplify-to-locations-only.md §4）：
--   主路线 = 该地点最早创建的路线（ORDER BY created_at ASC, rowid ASC 取第一；并列 created_at 取插入序）
--   多路线地点的非主路线以统一附录写进 description：正文 + 空行 +「另有路线：名称（难度/时长/距离）；…」
--   难度用 UI 同款中文标签（enums.json：轻松/适中/挑战/专家）
-- 原子性：各语句独立原子（SQLite 单语句天然原子）；wrangler d1 migrations apply 逐文件应用
-- 幂等：附录仅当 description 不含「另有路线：」时追加，staging/prod 重跑安全

ALTER TABLE `locations` ADD `difficulty` text;
--> statement-breakpoint
ALTER TABLE `locations` ADD `duration_min` integer;
--> statement-breakpoint
ALTER TABLE `locations` ADD `duration_max` integer;
--> statement-breakpoint
ALTER TABLE `locations` ADD `distance` real;
--> statement-breakpoint
ALTER TABLE `locations` ADD `elevation` integer;
--> statement-breakpoint
-- 回填：五字段取自主路线（最早创建）
UPDATE locations SET
  difficulty = (SELECT r.difficulty FROM routes r WHERE r.location_id = locations.id ORDER BY r.created_at ASC, r.rowid ASC LIMIT 1),
  duration_min = (SELECT r.duration_min FROM routes r WHERE r.location_id = locations.id ORDER BY r.created_at ASC, r.rowid ASC LIMIT 1),
  duration_max = (SELECT r.duration_max FROM routes r WHERE r.location_id = locations.id ORDER BY r.created_at ASC, r.rowid ASC LIMIT 1),
  distance = (SELECT r.distance FROM routes r WHERE r.location_id = locations.id ORDER BY r.created_at ASC, r.rowid ASC LIMIT 1),
  elevation = (SELECT r.elevation FROM routes r WHERE r.location_id = locations.id ORDER BY r.created_at ASC, r.rowid ASC LIMIT 1)
WHERE EXISTS (SELECT 1 FROM routes r WHERE r.location_id = locations.id);
--> statement-breakpoint
-- 附录：多路线地点的非主路线写进描述（前缀「另有路线：」可 grep，供内容侧后续润色）
UPDATE locations SET description = description || char(10) || char(10) || '另有路线：' || (
  SELECT group_concat(line, '；') FROM (
    SELECT r2.name || '（'
      || CASE r2.difficulty WHEN 'easy' THEN '轻松' WHEN 'moderate' THEN '适中' WHEN 'hard' THEN '挑战' WHEN 'expert' THEN '专家' ELSE r2.difficulty END
      || '/'
      || CASE WHEN r2.duration_min % 60 = 0 THEN CAST(r2.duration_min / 60 AS TEXT) ELSE printf('%.1f', r2.duration_min / 60.0) END
      || '-'
      || CASE WHEN r2.duration_max % 60 = 0 THEN CAST(r2.duration_max / 60 AS TEXT) ELSE printf('%.1f', r2.duration_max / 60.0) END
      || 'h/'
      || printf('%g', r2.distance) || 'km'
      || '）' AS line
    FROM routes r2
    WHERE r2.location_id = locations.id
      AND r2.rowid != (SELECT r3.rowid FROM routes r3 WHERE r3.location_id = locations.id ORDER BY r3.created_at ASC, r3.rowid ASC LIMIT 1)
    ORDER BY r2.created_at ASC, r2.rowid ASC
  )
)
WHERE (SELECT COUNT(*) FROM routes r WHERE r.location_id = locations.id) > 1
  AND description NOT LIKE '%另有路线：%';
