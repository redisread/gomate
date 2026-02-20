-- 插入 mock 用户（领队）
INSERT OR IGNORE INTO users (id, name, email, emailVerified, image, bio, experience, level, completed_hikes, createdAt, updatedAt) VALUES
('user-1', '山野行者', 'user1@gomate.com', 0, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', '资深户外爱好者，深圳百山打卡进行中，擅长路线规划和安全保障。', 'advanced', 'advanced', 47, 1707955200, 1707955200),
('user-2', '光影猎人', 'user2@gomate.com', 0, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', '风光摄影师，专注山海摄影，熟悉深圳各大观景点最佳拍摄时机。', 'expert', 'expert', 82, 1707868800, 1707868800),
('user-3', '暖心领队', 'user3@gomate.com', 0, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', '热爱分享，擅长带领新手入门，注重团队安全和体验。', 'intermediate', 'intermediate', 23, 1708041600, 1708041600),
('user-4', '夜行侠', 'user4@gomate.com', 0, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face', '夜爬达人，熟悉梧桐山每一条夜路，保证安全看日出。', 'advanced', 'advanced', 56, 1707955200, 1707955200),
('user-5', '快乐妈妈', 'user5@gomate.com', 0, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face', '两个孩子的妈妈，热爱自然教育，组织过多次亲子户外活动。', 'intermediate', 'intermediate', 31, 1708041600, 1708041600),
('user-6', '海岸线', 'user6@gomate.com', 0, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face', '深圳土生土长，对东西冲海岸线如数家珍，是绝佳的向导。', 'expert', 'expert', 68, 1707868800, 1707868800),
('user-7', '马峦小飞侠', 'user7@gomate.com', 0, 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop&crop=face', '马峦山常客，熟悉每个瀑布的最佳观赏时间和摄影角度。', 'advanced', 'advanced', 42, 1707955200, 1707955200),
('user-8', '亲子玩家', 'user8@gomate.com', 0, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face', '热爱带孩子探索大自然，善于在游戏中寓教于乐，孩子们都很喜欢。', 'beginner', 'beginner', 18, 1708128000, 1708128000),
('user-9', '晨练达人', 'user9@gomate.com', 0, 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=100&h=100&fit=crop&crop=face', '坚持晨爬3年，熟悉塘朗山每一条小路，欢迎加入晨练队伍。', 'intermediate', 'intermediate', 35, 1708041600, 1708041600),
('user-10', '星空漫步', 'user10@gomate.com', 0, 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=100&h=100&fit=crop&crop=face', '天文爱好者，喜欢带朋友看星星，讲解星座知识。', 'beginner', 'beginner', 15, 1707868800, 1707868800);

-- 插入 mock 队伍
INSERT OR IGNORE INTO teams (id, location_id, leader_id, title, description, start_time, end_time, duration, max_members, current_members, requirements, status, created_at, updated_at) VALUES
-- team-1: 七娘山挑战队
('team-1', 'qiniangshan', 'user-1', '七娘山挑战队 - 周六登顶看海', '本周六计划挑战七娘山，看绝美海景。目前已有3人，再找2-3位伙伴一起。要求有一定体力基础，不恐高。',
 1740207600, 1740232800, '7小时', 6, 3, '["有徒步经验", "体能较好", "自备装备"]', 'recruiting', 1707955200, 1707955200),

-- team-2: 七娘山摄影小队
('team-2', 'qiniangshan', 'user-2', '七娘山摄影小队 - 日出专线', '周日清晨出发，登顶拍摄七娘山日出和云海。携带无人机和相机，欢迎摄影爱好者加入。',
 1740288600, 1740316800, '8小时', 4, 4, '["摄影爱好者", "能早起", "有头灯"]', 'full', 1707868800, 1707868800),

-- team-3: 新手友好队
('team-3', 'qiniangshan', 'user-3', '新手友好 - 七娘山慢摇队', '慢节奏登山，不赶路，享受风景。适合第一次爬七娘山的朋友，领队会详细讲解路线和安全知识。',
 1740211200, 1740240000, '8小时', 8, 2, '["新手友好", "听从指挥", "准时集合"]', 'recruiting', 1708041600, 1708041600),

-- team-4: 梧桐山夜爬
('team-4', 'wutongshan', 'user-4', '梧桐山夜爬 - 看城市日出', '周六凌晨夜爬梧桐山，在山顶看深圳最美日出。夜爬别有一番风味，欢迎胆大心细的朋友加入。',
 1740193200, 1740214800, '5小时', 10, 6, '["有夜爬经验", "带头灯", "保暖衣物"]', 'recruiting', 1707955200, 1707955200),

-- team-5: 梧桐山亲子队
('team-5', 'wutongshan', 'user-5', '梧桐山亲子徒步队', '周日带小朋友一起爬梧桐山，走较轻松的泰山涧路线。培养小朋友热爱自然、坚持锻炼的好习惯。',
 1740286800, 1740308400, '6小时', 6, 4, '["带小孩", "有经验", "耐心友善"]', 'recruiting', 1708041600, 1708041600),

-- team-6: 东西冲穿越
('team-6', 'dongxichong', 'user-6', '东西冲穿越 - 最美海岸线', '周日东西冲经典海岸线穿越，全长约8公里。风景绝美，但部分路段需要攀爬礁石，需要一定体力。',
 1740294000, 1740319200, '6小时', 8, 3, '["体能好", "防滑鞋", "手套"]', 'recruiting', 1707955200, 1707955200),

-- team-7: 马峦山瀑布
('team-7', 'maluanshan', 'user-7', '马峦山瀑布群探秘', '周六探索马峦山瀑布群，近期雨水充足，瀑布水量大，正是最佳观赏期。欢迎摄影爱好者加入。',
 1740207600, 1740225600, '5小时', 6, 5, '["喜欢摄影", "防滑鞋", "备换衣物"]', 'full', 1707868800, 1707868800),

-- team-8: 马峦山亲子
('team-8', 'maluanshan', 'user-8', '马峦山亲子戏水团', '周日马峦山轻松徒步，看瀑布、玩水、野餐。适合带小朋友的家庭，让孩子们亲近自然。',
 1740294000, 1740312000, '5小时', 5, 2, '["带小孩", "玩水装备", "野餐食物"]', 'recruiting', 1708128000, 1708128000),

-- team-9: 塘朗山晨练
('team-9', 'tanglangshan', 'user-9', '塘朗山晨练打卡队', '每天早起爬塘朗山，锻炼身体，呼吸新鲜空气。路线成熟，适合想养成运动习惯的朋友。',
 1739991600, 1739998800, '2小时', 10, 4, '["能早起", "坚持锻炼", "轻松装备"]', 'recruiting', 1708041600, 1708041600),

-- team-10: 塘朗山夜爬
('team-10', 'tanglangshan', 'user-10', '塘朗山夜爬观星', '周五晚上塘朗山夜爬，山顶看城市夜景和星空。路线安全，适合下班后放松。',
 1740156600, 1740163800, '2小时', 8, 7, '["头灯", "晚上有空"]', 'full', 1707868800, 1707868800);

-- 插入领队成员记录
INSERT OR IGNORE INTO team_members (id, team_id, user_id, role, status, joined_at, created_at) VALUES
('tm-1', 'team-1', 'user-1', 'leader', 'approved', 1707955200, 1707955200),
('tm-2', 'team-2', 'user-2', 'leader', 'approved', 1707868800, 1707868800),
('tm-3', 'team-3', 'user-3', 'leader', 'approved', 1708041600, 1708041600),
('tm-4', 'team-4', 'user-4', 'leader', 'approved', 1707955200, 1707955200),
('tm-5', 'team-5', 'user-5', 'leader', 'approved', 1708041600, 1708041600),
('tm-6', 'team-6', 'user-6', 'leader', 'approved', 1707955200, 1707955200),
('tm-7', 'team-7', 'user-7', 'leader', 'approved', 1707868800, 1707868800),
('tm-8', 'team-8', 'user-8', 'leader', 'approved', 1708128000, 1708128000),
('tm-9', 'team-9', 'user-9', 'leader', 'approved', 1708041600, 1708041600),
('tm-10', 'team-10', 'user-10', 'leader', 'approved', 1707868800, 1707868800);
