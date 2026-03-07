-- 创建 pois 表和 entity_to_pois 表，替代旧的 points 表
-- pois 存储物理兴趣点，entity_to_pois 定义 POI 在不同上下文中的角色

-- ==================== Step 1: 创建 pois 表 ====================
CREATE TABLE pois (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  coordinates TEXT NOT NULL,
  category TEXT,
  images TEXT,
  extra TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX pois_name_idx ON pois(name);
CREATE INDEX pois_category_idx ON pois(category);

-- ==================== Step 2: 创建 entity_to_pois 表 ====================
CREATE TABLE entity_to_pois (
  id TEXT PRIMARY KEY NOT NULL,
  poi_id TEXT NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  role_type TEXT NOT NULL,
  "order" INTEGER,
  role_specific_data TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX entity_to_pois_poi_idx ON entity_to_pois(poi_id);
CREATE INDEX entity_to_pois_entity_idx ON entity_to_pois(entity_type, entity_id);
CREATE INDEX entity_to_pois_role_idx ON entity_to_pois(role_type);
CREATE INDEX entity_to_pois_order_idx ON entity_to_pois(entity_id, "order");
CREATE UNIQUE INDEX entity_to_pois_unique_idx ON entity_to_pois(poi_id, entity_type, entity_id, role_type);

-- ==================== Step 3: 删除旧的 points 表 ====================
DROP TABLE IF EXISTS points;
