-- 为 locations.name 添加前缀搜索索引
-- 用于优化前缀匹配搜索（LIKE 'keyword%'）
CREATE INDEX IF NOT EXISTS locations_name_idx ON locations(name);
