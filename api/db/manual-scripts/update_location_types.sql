-- ========================================
-- GoMate 地点类型分类更新脚本
-- 根据地点名称智能判断类型并更新
-- ========================================

-- 查看当前数据状态（执行前请先运行此查询确认数据）
-- SELECT id, name, COALESCE(type, 'NULL') as current_type FROM locations ORDER BY name;

-- ========================================
-- 类型分类规则：
-- hiking（户外徒步）: 山、峰、岭、森林、郊野径、古道、峡谷、瀑布
-- explore（城市探索）: 老街、创意园、市集、展览、艺术区、古城、历史街区
-- leisure（休闲探店）: 咖啡、茶室、书店、酒吧、餐厅、美食、甜品、奶茶
-- travel（旅行）: 古镇、海边、民宿、酒店、景区、度假村、海滩、岛屿
-- ========================================

-- 1. 户外徒步 (hiking) - 山岳、自然类
UPDATE locations SET type = 'hiking' WHERE type IS NULL AND (
  name LIKE '%山%' OR
  name LIKE '%峰%' OR
  name LIKE '%岭%' OR
  name LIKE '%森林%' OR
  name LIKE '%郊野%' OR
  name LIKE '%古道%' OR
  name LIKE '%峡谷%' OR
  name LIKE '%瀑布%' OR
  name LIKE '%岩%' OR
  name LIKE '%崖%' OR
  name LIKE '%谷%'
);

-- 2. 城市探索 (explore) - 城市文化类
UPDATE locations SET type = 'explore' WHERE type IS NULL AND (
  name LIKE '%老街%' OR
  name LIKE '%古城%' OR
  name LIKE '%创意园%' OR
  name LIKE '%文创%' OR
  name LIKE '%市集%' OR
  name LIKE '%集市%' OR
  name LIKE '%展览%' OR
  name LIKE '%美术馆%' OR
  name LIKE '%博物馆%' OR
  name LIKE '%图书馆%' OR
  name LIKE '%艺术%' OR
  name LIKE '%历史%' OR
  name LIKE '%文化%' OR
  name LIKE '%街区%' OR
  name LIKE '%广场%' OR
  name LIKE '%公园%' AND name NOT LIKE '%山%'
);

-- 3. 休闲探店 (leisure) - 餐饮、休闲类
UPDATE locations SET type = 'leisure' WHERE type IS NULL AND (
  name LIKE '%咖啡%' OR
  name LIKE '%茶%' OR
  name LIKE '%奶茶%' OR
  name LIKE '%甜品%' OR
  name LIKE '%蛋糕%' OR
  name LIKE '%面包%' OR
  name LIKE '%书店%' OR
  name LIKE '%酒吧%' OR
  name LIKE '%酒馆%' OR
  name LIKE '%餐厅%' OR
  name LIKE '%美食%' OR
  name LIKE '%火锅%' OR
  name LIKE '%烧烤%' OR
  name LIKE '%下午茶%' OR
  name LIKE '%brunch%' OR
  name LIKE '%清吧%'
);

-- 4. 旅行 (travel) - 度假、景点类
UPDATE locations SET type = 'travel' WHERE type IS NULL AND (
  name LIKE '%古镇%' OR
  name LIKE '%古村%' OR
  name LIKE '%海边%' OR
  name LIKE '%海滩%' OR
  name LIKE '%海岸%' OR
  name LIKE '%海岛%' OR
  name LIKE '%岛屿%' OR
  name LIKE '%沙滩%' OR
  name LIKE '%民宿%' OR
  name LIKE '%酒店%' OR
  name LIKE '%度假村%' OR
  name LIKE '%景区%' OR
  name LIKE '%景点%' OR
  name LIKE '%旅游%' OR
  name LIKE '%度假%'
);

-- ========================================
-- 验证更新结果
-- ========================================
SELECT type, COUNT(*) as count FROM locations GROUP BY type;

-- 查看未分类的地点（如有）
-- SELECT id, name FROM locations WHERE type IS NULL;

-- 查看分类详情
-- SELECT id, name, type FROM locations ORDER BY type, name;
