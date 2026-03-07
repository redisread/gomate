-- 添加 duration_min 列到 teams 表
ALTER TABLE `teams` ADD `duration_min` integer DEFAULT 240 NOT NULL;

-- 为现有数据计算并填充 duration_min（从 end_time - start_time 计算，转换为分钟）
-- 注意：D1 SQLite 中时间戳存储为 Unix 毫秒时间戳
UPDATE `teams` SET `duration_min` = (`end_time` - `start_time`) / 60000 WHERE `duration_min` IS NULL;
