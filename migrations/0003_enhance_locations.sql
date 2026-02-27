-- 扩展 locations 表以支持 mock.ts 中的完整字段

-- 添加新列
ALTER TABLE `locations` ADD COLUMN `subtitle` TEXT;
ALTER TABLE `locations` ADD COLUMN `elevation` TEXT;
ALTER TABLE `locations` ADD COLUMN `tags` TEXT;
ALTER TABLE `locations` ADD COLUMN `address` TEXT;
ALTER TABLE `locations` ADD COLUMN `route_guide` TEXT;
ALTER TABLE `locations` ADD COLUMN `waypoints` TEXT;
ALTER TABLE `locations` ADD COLUMN `warnings` TEXT;
ALTER TABLE `locations` ADD COLUMN `facilities` TEXT;

-- 插入完整的地点数据（包含 mock.ts 中的所有信息）
INSERT OR REPLACE INTO `locations` (
    `id`, `name`, `slug`, `subtitle`, `description`, `difficulty`, `duration`, `distance`, `elevation`,
    `best_season`, `tags`, `cover_image`, `images`, `address`, `coordinates`,
    `route_description`, `route_guide`, `waypoints`, `tips`, `warnings`, `equipment_needed`, `facilities`,
    `created_at`, `updated_at`
) VALUES (
    'qiniangshan',
    '七娘山',
    'qiniangshan',
    '深圳第二高峰',
    '七娘山位于大鹏半岛南端，是深圳第二高峰，主峰海拔869米。山势险峻、雄伟，山中奇峰异石、岩洞、山泉、密林交相辉映。登高望远，可将大鹏半岛海景尽收眼底，是深圳户外爱好者的必登之地。',
    'hard',
    '6-8小时',
    '12公里',
    '869米',
    '春季、秋季、冬季',
    '["海景", "山峰", "摄影", "挑战"]',
    'https://gomate.cos.jiahongw.com/locations/20260218151246_43_47.jpg',
    '["https://gomate.cos.jiahongw.com/locations/20260218151246_43_47.jpg","https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&h=600&fit=crop"]',
    '深圳市大鹏新区南澳街道',
    '{"lat":22.4523,"lng":114.5321}',
    '七娘山环线是经典徒步路线，从地质公园出发，经主峰后从另一侧下山，全程约12公里。',
    '{"overview":"七娘山环线是经典徒步路线，从地质公园出发，经主峰后从另一侧下山，全程约12公里。","tips":["建议携带登山杖，部分路段较陡","山顶风大，记得带防风外套","全程无补给，需自备充足水和食物","建议早上7点前出发，避免摸黑下山"]}',
    '[{"name":"地质公园入口","description":"起点，有停车场和洗手间","distance":"0km"},{"name":"一号观景台","description":"可远眺大鹏湾","distance":"2.5km"},{"name":"七娘山主峰","description":"深圳第二高峰，360度海景","distance":"5km"},{"name":"三角山","description":"次高峰，视野开阔","distance":"7km"},{"name":"杨梅坑方向出口","description":"终点，可乘坐公交返回","distance":"12km"}]',
    '建议携带登山杖\n山顶风大记得带外套\n全程无补给',
    '["雷雨天气严禁登山","部分路段无手机信号","不要独自前往，建议组队"]',
    '["登山杖","防风外套","充足的水"]',
    '{"parking":true,"restroom":true,"water":false,"food":false}',
    1700000000000,
    1700000000000
);

INSERT OR REPLACE INTO `locations` (
    `id`, `name`, `slug`, `subtitle`, `description`, `difficulty`, `duration`, `distance`, `elevation`,
    `best_season`, `tags`, `cover_image`, `images`, `address`, `coordinates`,
    `route_description`, `route_guide`, `waypoints`, `tips`, `warnings`, `equipment_needed`, `facilities`,
    `created_at`, `updated_at`
) VALUES (
    'wutongshan',
    '梧桐山',
    'wutongshan',
    '深圳第一高峰',
    '梧桐山位于深圳东部，主峰大梧桐海拔943.7米，是深圳最高峰。这里山势巍峨，森林茂密，是深圳市民最喜爱的登山目的地之一。从山顶可俯瞰深圳市区和香港新界，景色壮观。',
    'moderate',
    '4-6小时',
    '10公里',
    '943米',
    '全年',
    '["城市景观", "森林", "日出", "热门"]',
    'https://gomate.cos.jiahongw.com/locations/20260218151440_44_47.jpg',
    '["https://gomate.cos.jiahongw.com/locations/20260218151440_44_47.jpg","https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop"]',
    '深圳市罗湖区梧桐山村',
    '{"lat":22.5836,"lng":114.2165}',
    '梧桐山有多条登山路线，最经典的是从梧桐山村出发，经好汉坡登顶，全程约10公里。',
    '{"overview":"梧桐山有多条登山路线，最经典的是从梧桐山村出发，经好汉坡登顶，全程约10公里。","tips":["周末人多，建议早出发","好汉坡较陡，量力而行","山顶有补给点但价格较高","想看日出需凌晨3点开始登山"]}',
    '[{"name":"梧桐山村入口","description":"主要登山口，设施完善","distance":"0km"},{"name":"凤凰台","description":"中途休息点，有洗手间","distance":"3km"},{"name":"好汉坡","description":"最陡峭路段，挑战体力","distance":"5km"},{"name":"大梧桐主峰","description":"深圳最高峰，鹏城第一峰","distance":"6km"},{"name":"泰山涧","description":"下山路线，溪流相伴","distance":"10km"}]',
    '夜爬请带好头灯\n周末人多建议早出发\n山顶有卖水',
    '["节假日人流量大，注意安全","夜间登山需带头灯","不要偏离指定路线"]',
    '["头灯","登山鞋","防晒用品"]',
    '{"parking":true,"restroom":true,"water":true,"food":true}',
    1700000000000,
    1700000000000
);

INSERT OR REPLACE INTO `locations` (
    `id`, `name`, `slug`, `subtitle`, `description`, `difficulty`, `duration`, `distance`, `elevation`,
    `best_season`, `tags`, `cover_image`, `images`, `address`, `coordinates`,
    `route_description`, `route_guide`, `waypoints`, `tips`, `warnings`, `equipment_needed`, `facilities`,
    `created_at`, `updated_at`
) VALUES (
    'dongxichong',
    '东西冲',
    'dongxichong',
    '最美海岸线',
    '东西冲穿越是深圳最经典的海岸线徒步路线，从东冲沙滩到西冲沙滩，全长约8公里。沿途可欣赏深圳最美的海岸风光，包括海蚀崖、海蚀洞、海蚀平台等地质奇观，被誉为"中国最美八大海岸线"之一。',
    'moderate',
    '5-7小时',
    '8公里',
    '200米',
    '秋季、冬季、春季',
    '["海岸线", "沙滩", "摄影", "亲子"]',
    'https://gomate.cos.jiahongw.com/locations/20260218151907_46_47.jpg',
    '["https://gomate.cos.jiahongw.com/locations/20260218151907_46_47.jpg","https://images.unsplash.com/photo-1437719417032-8595fd9e9dc6?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop"]',
    '深圳市大鹏新区南澳街道',
    '{"lat":22.4567,"lng":114.5234}',
    '东西冲穿越是深圳最受欢迎的海岸线路线，沿途需要攀爬礁石、穿越沙滩，风景绝美。',
    '{"overview":"东西冲穿越是深圳最受欢迎的海岸线路线，沿途需要攀爬礁石、穿越沙滩，风景绝美。","tips":["穿防滑鞋，礁石湿滑","带手套，需要手脚并用","注意潮汐时间，涨潮时部分路段无法通行","沿途有快艇可紧急撤离"]}',
    '[{"name":"东冲沙滩","description":"起点，可停车","distance":"0km"},{"name":"鬼仔角","description":"第一个海蚀崖观景点","distance":"2km"},{"name":"穿鼻岩","description":"标志性景点，需攀爬","distance":"4km"},{"name":"西冲四号沙滩","description":"终点，可游泳休息","distance":"8km"}]',
    '穿防滑鞋\n带手套\n注意潮汐',
    '["雨天路滑，不建议前往","注意防晒，海边紫外线强","不要单独行动"]',
    '["防滑鞋","手套","防晒"]',
    '{"parking":true,"restroom":true,"water":true,"food":true}',
    1700000000000,
    1700000000000
);

INSERT OR REPLACE INTO `locations` (
    `id`, `name`, `slug`, `subtitle`, `description`, `difficulty`, `duration`, `distance`, `elevation`,
    `best_season`, `tags`, `cover_image`, `images`, `address`, `coordinates`,
    `route_description`, `route_guide`, `waypoints`, `tips`, `warnings`, `equipment_needed`, `facilities`,
    `created_at`, `updated_at`
) VALUES (
    'maluanshan',
    '马峦山',
    'maluanshan',
    '瀑布群秘境',
    '马峦山位于深圳坪山区，以瀑布群闻名。这里有深圳最大的瀑布群，最大的瀑布落差达30米。山中植被茂密，溪流潺潺，是深圳难得的清幽之地，非常适合周末休闲徒步。',
    'easy',
    '3-4小时',
    '6公里',
    '400米',
    '夏季、秋季',
    '["瀑布", "溪流", "休闲", "亲子"]',
    'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&h=600&fit=crop',
    '["https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop"]',
    '深圳市坪山区马峦街道',
    '{"lat":22.6789,"lng":114.3456}',
    '马峦山有多条路线，最经典的是从北门进入，经瀑布群后从西北门出，全程约6公里。',
    '{"overview":"马峦山有多条路线，最经典的是从北门进入，经瀑布群后从西北门出，全程约6公里。","tips":["雨后瀑布水量更大，景色更佳","可带泳衣，部分水潭可游泳","夏季蚊虫多，带好驱蚊水","适合带小朋友，路线较轻松"]}',
    '[{"name":"马峦山北门","description":"主要入口，有停车场","distance":"0km"},{"name":"碧岭瀑布","description":"第一个瀑布，落差约15米","distance":"1.5km"},{"name":"马峦大瀑布","description":"最大瀑布，落差30米","distance":"3km"},{"name":"红花岭","description":"山顶平台，可远眺","distance":"4.5km"},{"name":"西北门","description":"出口，可乘公交","distance":"6km"}]',
    '雨天路滑注意安全\n带好驱蚊水',
    '["瀑布附近石头湿滑，小心行走","不要攀爬瀑布","注意保护水源，不要乱扔垃圾"]',
    '["驱蚊水","雨具","防滑鞋"]',
    '{"parking":true,"restroom":true,"water":true,"food":false}',
    1700000000000,
    1700000000000
);

INSERT OR REPLACE INTO `locations` (
    `id`, `name`, `slug`, `subtitle`, `description`, `difficulty`, `duration`, `distance`, `elevation`,
    `best_season`, `tags`, `cover_image`, `images`, `address`, `coordinates`,
    `route_description`, `route_guide`, `waypoints`, `tips`, `warnings`, `equipment_needed`, `facilities`,
    `created_at`, `updated_at`
) VALUES (
    'tanglangshan',
    '塘朗山',
    'tanglangshan',
    '城市绿肺',
    '塘朗山位于深圳南山区，是市中心的一片绿洲。主峰海拔430米，可俯瞰深圳湾和香港。这里交通便利，是深圳市民日常锻炼和周末休闲的好去处，特别适合初次尝试徒步的新手。',
    'easy',
    '2-3小时',
    '5公里',
    '430米',
    '全年',
    '["城市", "休闲", "观景", "新手"]',
    'https://gomate.cos.jiahongw.com/locations/20260218152026_47_47.jpg',
    '["https://gomate.cos.jiahongw.com/locations/20260218152026_47_47.jpg","https://images.unsplash.com/photo-1511497584788-876760111969?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&h=600&fit=crop"]',
    '深圳市南山区龙珠六路',
    '{"lat":22.5567,"lng":113.9789}',
    '塘朗山路线简单明了，从龙珠门进入，沿盘山公路或石阶路登顶，适合各年龄段。',
    '{"overview":"塘朗山路线简单明了，从龙珠门进入，沿盘山公路或石阶路登顶，适合各年龄段。","tips":["地铁7号线桃源村站D出口直达","可带宠物，需牵绳","山顶有自动售货机","傍晚可看日落和城市夜景"]}',
    '[{"name":"龙珠门入口","description":"主入口，地铁可达","distance":"0km"},{"name":"百尺天梯","description":"石阶路段，稍有挑战","distance":"2km"},{"name":"塘朗山顶","description":"观景平台，俯瞰深圳湾","distance":"3km"},{"name":"茶香径","description":"下山步道，林荫遮蔽","distance":"5km"}]',
    '公交直达\n有厕所和休息点\n适合新手',
    '["周末人流量大","夜间照明有限","注意野猪出没（罕见）"]',
    '["运动鞋","水","小零食"]',
    '{"parking":true,"restroom":true,"water":true,"food":false}',
    1700000000000,
    1700000000000
);
