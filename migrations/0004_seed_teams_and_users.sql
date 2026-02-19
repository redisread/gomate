-- 扩展 users 表添加额外字段
ALTER TABLE `users` ADD COLUMN `completed_hikes` INTEGER DEFAULT 0;
ALTER TABLE `users` ADD COLUMN `level` TEXT DEFAULT 'beginner';

-- 扩展 teams 表添加 duration 字段
ALTER TABLE `teams` ADD COLUMN `duration` TEXT;

-- 插入/更新用户数据（mock.ts 中的领队信息）
INSERT OR REPLACE INTO `users` (`id`, `name`, `email`, `email_verified`, `image`, `bio`, `experience`, `level`, `completed_hikes`, `created_at`, `updated_at`) VALUES
('user-1', '山野行者', 'hiker1@example.com', 1, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', '资深户外爱好者，深圳百山打卡进行中，擅长路线规划和安全保障。', 'advanced', 'advanced', 47, 1700000000000, 1700000000000),
('user-2', '光影猎人', 'photo@example.com', 1, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', '风光摄影师，专注山海摄影，熟悉深圳各大观景点最佳拍摄时机。', 'expert', 'expert', 82, 1700000000000, 1700000000000),
('user-3', '暖心领队', 'leader@example.com', 1, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', '热爱分享，擅长带领新手入门，注重团队安全和体验。', 'intermediate', 'intermediate', 23, 1700000000000, 1700000000000),
('user-4', '夜行侠', 'night@example.com', 1, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face', '夜爬达人，熟悉梧桐山每一条夜路，保证安全看日出。', 'advanced', 'advanced', 56, 1700000000000, 1700000000000),
('user-5', '超级奶爸', 'dad@example.com', 1, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face', '两个孩子的爸爸，经常带孩子户外活动，擅长亲子路线规划。', 'intermediate', 'intermediate', 31, 1700000000000, 1700000000000),
('user-6', '海之子', 'ocean@example.com', 1, 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop&crop=face', '海洋爱好者，熟悉大鹏半岛所有海岸线，擅长潮汐判断和路线选择。', 'advanced', 'advanced', 68, 1700000000000, 1700000000000),
('user-7', '星空摄影师', 'star@example.com', 1, 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop&crop=face', '专业摄影师，擅长星空和海景摄影，作品多次获奖。', 'expert', 'expert', 93, 1700000000000, 1700000000000),
('user-8', '快乐行者', 'happy@example.com', 1, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face', '性格开朗，喜欢结交新朋友，擅长组织轻松愉快的户外活动。', 'intermediate', 'intermediate', 28, 1700000000000, 1700000000000),
('user-9', '晨练达人', 'morning@example.com', 1, 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=100&h=100&fit=crop&crop=face', '坚持晨爬3年，熟悉塘朗山每一条小路，欢迎加入晨练队伍。', 'intermediate', 'intermediate', 35, 1700000000000, 1700000000000),
('user-10', '星空漫步', 'starry@example.com', 1, 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=100&h=100&fit=crop&crop=face', '天文爱好者，喜欢带朋友看星星，讲解星座知识。', 'beginner', 'beginner', 15, 1700000000000, 1700000000000);

-- 清除旧队伍数据（可选，如果需要完全替换）
-- DELETE FROM `team_members` WHERE `team_id` LIKE 'team-%';
-- DELETE FROM `teams` WHERE `id` LIKE 'team-%';

-- 插入完整的队伍数据（来自 mock.ts）
-- 注意：start_time 和 end_time 需要根据具体日期计算
-- 这里使用示例时间戳，实际部署时可能需要调整

-- team-1: 七娘山挑战队 - 周六登顶看海
INSERT OR REPLACE INTO `teams` (`id`, `location_id`, `leader_id`, `title`, `description`, `start_time`, `end_time`, `duration`, `max_members`, `current_members`, `requirements`, `status`, `created_at`, `updated_at`) VALUES
('team-1', 'qiniangshan', 'user-1', '七娘山挑战队 - 周六登顶看海', '本周六计划挑战七娘山，看绝美海景。目前已有3人，再找2-3位伙伴一起。要求有一定体力基础，不恐高。', 1740188400000, 1740213600000, '7小时', 6, 3, '["有徒步经验", "体能较好", "自备装备"]', 'open', 1706966400000, 1706966400000);

-- team-2: 七娘山摄影小队 - 日出专线
INSERT OR REPLACE INTO `teams` (`id`, `location_id`, `leader_id`, `title`, `description`, `start_time`, `end_time`, `duration`, `max_members`, `current_members`, `requirements`, `status`, `created_at`, `updated_at`) VALUES
('team-2', 'qiniangshan', 'user-2', '七娘山摄影小队 - 日出专线', '周日清晨出发，登顶拍摄七娘山日出和云海。携带无人机和相机，欢迎摄影爱好者加入。', 1740265800000, 1740294600000, '8小时', 4, 4, '["摄影爱好者", "能早起", "有头灯"]', 'full', 1706880000000, 1706880000000);

-- team-3: 新手友好 - 七娘山慢摇队
INSERT OR REPLACE INTO `teams` (`id`, `location_id`, `leader_id`, `title`, `description`, `start_time`, `end_time`, `duration`, `max_members`, `current_members`, `requirements`, `status`, `created_at`, `updated_at`) VALUES
('team-3', 'qiniangshan', 'user-3', '新手友好 - 七娘山慢摇队', '慢节奏登山，不赶路，享受风景。适合第一次爬七娘山的朋友，领队会详细讲解路线和安全知识。', 1740192000000, 1740220800000, '8小时', 8, 2, '["新手友好", "听从指挥", "准时集合"]', 'open', 1707052800000, 1707052800000);

-- team-4: 梧桐山夜爬 - 看城市日出
INSERT OR REPLACE INTO `teams` (`id`, `location_id`, `leader_id`, `title`, `description`, `start_time`, `end_time`, `duration`, `max_members`, `current_members`, `requirements`, `status`, `created_at`, `updated_at`) VALUES
('team-4', 'wutongshan', 'user-4', '梧桐山夜爬 - 看城市日出', '周六凌晨夜爬梧桐山，在山顶看深圳最美日出。夜爬别有一番风味，欢迎胆大心细的朋友加入。', 1740177600000, 1740195600000, '5小时', 10, 6, '["有夜爬经验", "带头灯", "保暖衣物"]', 'open', 1706966400000, 1706966400000);

-- team-5: 梧桐山亲子徒步队
INSERT OR REPLACE INTO `teams` (`id`, `location_id`, `leader_id`, `title`, `description`, `start_time`, `end_time`, `duration`, `max_members`, `current_members`, `requirements`, `status`, `created_at`, `updated_at`) VALUES
('team-5', 'wutongshan', 'user-5', '梧桐山亲子徒步队', '周日带小朋友一起爬梧桐山，走较轻松的泰山涧路线。培养小朋友热爱自然、坚持锻炼的好习惯。', 1740277200000, 1740295200000, '5小时', 5, 3, '["带6岁以上儿童", "家长陪同", "准备零食"]', 'open', 1707052800000, 1707052800000);

-- team-6: 东西冲穿越 - 海岸线探险
INSERT OR REPLACE INTO `teams` (`id`, `location_id`, `leader_id`, `title`, `description`, `start_time`, `end_time`, `duration`, `max_members`, `current_members`, `requirements`, `status`, `created_at`, `updated_at`) VALUES
('team-6', 'dongxichong', 'user-6', '东西冲穿越 - 海岸线探险', '周日东西冲穿越，体验深圳最美海岸线。需要一定体力，会经过礁石攀爬路段，刺激又好玩。', 1740283800000, 1740305400000, '6小时', 8, 5, '["防滑鞋", "手套", "不怕晒"]', 'open', 1706880000000, 1706880000000);

-- team-7: 东西冲摄影团 - 日落专线
INSERT OR REPLACE INTO `teams` (`id`, `location_id`, `leader_id`, `title`, `description`, `start_time`, `end_time`, `duration`, `max_members`, `current_members`, `requirements`, `status`, `created_at`, `updated_at`) VALUES
('team-7', 'dongxichong', 'user-7', '东西冲摄影团 - 日落专线', '下午出发，在东西冲拍摄日落和星空。适合喜欢慢节奏、爱拍照的朋友。', 1740213600000, 1740235200000, '6小时', 6, 6, '["摄影器材", "三脚架", "头灯"]', 'full', 1706793600000, 1706793600000);

-- team-8: 马峦山瀑布探秘 - 休闲局
INSERT OR REPLACE INTO `teams` (`id`, `location_id`, `leader_id`, `title`, `description`, `start_time`, `end_time`, `duration`, `max_members`, `current_members`, `requirements`, `status`, `created_at`, `updated_at`) VALUES
('team-8', 'maluanshan', 'user-8', '马峦山瀑布探秘 - 休闲局', '周六马峦山看瀑布，路线轻松，适合新手和想放松的朋友。可以带泳衣在水潭玩水。', 1740195600000, 1740210000000, '4小时', 10, 4, '["休闲装备", "可带泳衣", "防蚊液"]', 'open', 1706966400000, 1706966400000);

-- team-9: 塘朗山晨爬 - 开启活力一天
INSERT OR REPLACE INTO `teams` (`id`, `location_id`, `leader_id`, `title`, `description`, `start_time`, `end_time`, `duration`, `max_members`, `current_members`, `requirements`, `status`, `created_at`, `updated_at`) VALUES
('team-9', 'tanglangshan', 'user-9', '塘朗山晨爬 - 开启活力一天', '周日早上塘朗山晨练，轻松登顶后下山吃早餐。适合住在附近的朋友，养成运动好习惯。', 1740271800000, 1740280800000, '2.5小时', 6, 2, '["准时", "轻松装备"]', 'open', 1707052800000, 1707052800000);

-- team-10: 塘朗山夜爬观星
INSERT OR REPLACE INTO `teams` (`id`, `location_id`, `leader_id`, `title`, `description`, `start_time`, `end_time`, `duration`, `max_members`, `current_members`, `requirements`, `status`, `created_at`, `updated_at`) VALUES
('team-10', 'tanglangshan', 'user-10', '塘朗山夜爬观星', '周五晚上塘朗山夜爬，山顶看城市夜景和星空。路线安全，适合下班后放松。', 1740147000000, 1740154200000, '2小时', 8, 7, '["头灯", "晚上有空"]', 'open', 1706880000000, 1706880000000);

-- 插入队伍成员关系
INSERT OR REPLACE INTO `team_members` (`id`, `team_id`, `user_id`, `role`, `status`, `joined_at`, `created_at`) VALUES
('tm-1', 'team-1', 'user-1', 'leader', 'approved', 1706966400000, 1706966400000),
('tm-2', 'team-2', 'user-2', 'leader', 'approved', 1706880000000, 1706880000000),
('tm-3', 'team-3', 'user-3', 'leader', 'approved', 1707052800000, 1707052800000),
('tm-4', 'team-4', 'user-4', 'leader', 'approved', 1706966400000, 1706966400000),
('tm-5', 'team-5', 'user-5', 'leader', 'approved', 1707052800000, 1707052800000),
('tm-6', 'team-6', 'user-6', 'leader', 'approved', 1706880000000, 1706880000000),
('tm-7', 'team-7', 'user-7', 'leader', 'approved', 1706793600000, 1706793600000),
('tm-8', 'team-8', 'user-8', 'leader', 'approved', 1706966400000, 1706966400000),
('tm-9', 'team-9', 'user-9', 'leader', 'approved', 1707052800000, 1707052800000),
('tm-10', 'team-10', 'user-10', 'leader', 'approved', 1706880000000, 1706880000000);
