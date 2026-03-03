-- locations 表添加城市字段
ALTER TABLE `locations` ADD COLUMN `adcode` TEXT;
ALTER TABLE `locations` ADD COLUMN `city_name` TEXT;

-- 添加城市索引
CREATE INDEX IF NOT EXISTS `locations_adcode_idx` ON `locations` (`adcode`);

-- 更新现有数据：深圳的 adcode 为 440300
UPDATE `locations` SET adcode = '440300', city_name = '深圳' WHERE adcode IS NULL;