-- 用户表优化迁移
-- 新增字段: nickname, gender, birthday, extra, status, deletedAt
-- 删除字段: completedHikes
-- 优化索引: 新增 nameIdx

-- 新增字段
ALTER TABLE users ADD COLUMN nickname TEXT;
ALTER TABLE users ADD COLUMN gender TEXT;
ALTER TABLE users ADD COLUMN birthday INTEGER;
ALTER TABLE users ADD COLUMN extra TEXT;
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' NOT NULL;
ALTER TABLE users ADD COLUMN deleted_at INTEGER;

-- 删除冗余字段（SQLite 不支持直接删除列，需要重建表）
-- 由于 SQLite 的限制，我们保留 completed_hikes 字段但不再使用
-- 在应用层通过动态查询计算完成徒步次数

-- 新增索引
CREATE INDEX IF NOT EXISTS users_name_idx ON users(name);
