-- 初始化测试数据

-- 插入测试用户
INSERT OR IGNORE INTO `users` (`id`, `name`, `email`, `email_verified`, `image`, `bio`, `experience`, `created_at`, `updated_at`) VALUES
('user-1', '山野行者', 'hiker1@example.com', 1, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', '资深户外爱好者，深圳百山打卡进行中', 'advanced', 1700000000000, 1700000000000),
('user-2', '光影猎人', 'photo@example.com', 1, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', '风光摄影师，专注山海摄影', 'expert', 1700000000000, 1700000000000),
('user-3', '暖心领队', 'leader@example.com', 1, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', '热爱分享，擅长带领新手入门', 'intermediate', 1700000000000, 1700000000000),
('user-4', '夜行侠', 'night@example.com', 1, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face', '夜爬达人，熟悉梧桐山每一条夜路', 'advanced', 1700000000000, 1700000000000),
('user-5', '超级奶爸', 'dad@example.com', 1, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face', '两个孩子的爸爸，经常带孩子户外活动', 'intermediate', 1700000000000, 1700000000000);

-- 插入测试地点
INSERT OR IGNORE INTO `locations` (`id`, `name`, `slug`, `description`, `difficulty`, `duration`, `distance`, `best_season`, `cover_image`, `images`, `route_description`, `tips`, `equipment_needed`, `coordinates`, `created_at`, `updated_at`) VALUES
('qiniangshan', '七娘山', 'qiniangshan', '七娘山位于大鹏半岛南端，是深圳第二高峰，主峰海拔869米。山势险峻、雄伟，山中奇峰异石、岩洞、山泉、密林交相辉映。', 'hard', '6-8小时', '12公里', '春季、秋季、冬季', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=600&fit=crop', '["https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop"]', '七娘山环线是经典徒步路线，从地质公园出发，经主峰后从另一侧下山，全程约12公里。', '建议携带登山杖\n山顶风大记得带外套\n全程无补给', '["登山杖","防风外套","充足的水"]', '{"lat":22.4523,"lng":114.5321}', 1700000000000, 1700000000000),
('wutongshan', '梧桐山', 'wutongshan', '梧桐山位于深圳东部，主峰大梧桐海拔943.7米，是深圳最高峰。这里山势巍峨，森林茂密，是深圳市民最喜爱的登山目的地之一。', 'moderate', '4-6小时', '10公里', '全年', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop', '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop"]', '梧桐山有多条登山路线，最经典的是从梧桐山村出发，经百年古道登顶。', '夜爬请带好头灯\n周末人多建议早出发\n山顶有卖水', '["头灯","登山鞋","防晒用品"]', '{"lat":22.5964,"lng":114.2170}', 1700000000000, 1700000000000),
('dongchong', '东西冲', 'dongchong', '东西冲海岸线是深圳最美的海岸线之一，被《国家地理》评为中国最美的八大海岸线之一。', 'moderate', '5-6小时', '8公里', '秋季、冬季', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=600&fit=crop', '["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop"]', '东冲出发，沿着海岸线徒步至西冲，沿途有礁石、沙滩、悬崖等多种地貌。', '穿防滑鞋\n带手套\n注意潮汐', '["防滑鞋","手套","防晒"]', '{"lat":22.4654,"lng":114.5642}', 1700000000000, 1700000000000),
('maluanshan', '马峦山', 'maluanshan', '马峦山位于坪山区，以瀑布群闻名，是深圳最近的观瀑胜地。', 'easy', '3-4小时', '6公里', '夏季、秋季', 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200&h=600&fit=crop', '["https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&h=600&fit=crop"]', '从马峦山郊野公园入口进入，沿途经过多个瀑布，终点是马峦山村。', '雨天路滑注意安全\n带好驱蚊水', '["驱蚊水","雨具","防滑鞋"]', '{"lat":22.6423,"lng":114.3521}', 1700000000000, 1700000000000),
('tanglangshan', '塘朗山', 'tanglangshan', '塘朗山位于南山区，是深圳市区的后花园，交通便利，适合日常锻炼。', 'easy', '2-3小时', '5公里', '全年', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=600&fit=crop', '["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop"]', '龙珠门入口上山，有盘山公路和登山道可选，适合各年龄段。', '公交直达\n有厕所和休息点\n适合新手', '["运动鞋","水","小零食"]', '{"lat":22.5834,"lng":113.9912}', 1700000000000, 1700000000000);

-- 插入测试队伍
INSERT OR IGNORE INTO `teams` (`id`, `location_id`, `leader_id`, `title`, `description`, `start_time`, `end_time`, `max_members`, `current_members`, `requirements`, `status`, `created_at`, `updated_at`) VALUES
('team-1', 'qiniangshan', 'user-1', '七娘山周末挑战', '计划周六早上出发，走完七娘山环线，需要有经验的队友，预计6-7小时完成。', 1703030400000, 1703044800000, 8, 3, '有登山经验，能完成10公里以上路线', 'recruiting', 1700000000000, 1700000000000),
('team-2', 'wutongshan', 'user-4', '梧桐山夜爬看日出', '周六凌晨3点集合夜爬梧桐山，看深圳最美日出，新手友好。', 1703116800000, 1703145600000, 10, 5, '能早起，有头灯或手电筒', 'recruiting', 1700000000000, 1700000000000),
('team-3', 'dongchong', 'user-2', '东西冲海岸线摄影团', '摄影爱好者组队，一起拍摄最美海岸线，会分享拍摄技巧。', 1703203200000, 1703224800000, 6, 2, '有相机或无人机优先', 'recruiting', 1700000000000, 1700000000000),
('team-4', 'maluanshan', 'user-3', '马峦山亲子徒步', '带孩子一起亲近自然，适合5岁以上小朋友，行程轻松。', 1703289600000, 1703304000000, 12, 4, '带孩子家庭优先', 'recruiting', 1700000000000, 1700000000000),
('team-5', 'tanglangshan', 'user-5', '塘朗山日常锻炼', '每周三固定活动，欢迎附近的上班族一起锻炼，下班后出发。', 1703095200000, 1703106000000, 15, 8, '不限经验，欢迎新人', 'recruiting', 1700000000000, 1700000000000);

-- 插入队伍成员
INSERT OR IGNORE INTO `team_members` (`id`, `team_id`, `user_id`, `role`, `status`, `joined_at`, `created_at`) VALUES
('tm-1', 'team-1', 'user-1', 'leader', 'approved', 1700000000000, 1700000000000),
('tm-2', 'team-1', 'user-2', 'member', 'approved', 1700000100000, 1700000100000),
('tm-3', 'team-1', 'user-3', 'member', 'pending', NULL, 1700000200000),
('tm-4', 'team-2', 'user-4', 'leader', 'approved', 1700000000000, 1700000000000),
('tm-5', 'team-2', 'user-1', 'member', 'approved', 1700000100000, 1700000100000),
('tm-6', 'team-3', 'user-2', 'leader', 'approved', 1700000000000, 1700000000000),
('tm-7', 'team-4', 'user-3', 'leader', 'approved', 1700000000000, 1700000000000),
('tm-8', 'team-5', 'user-5', 'leader', 'approved', 1700000000000, 1700000000000);
