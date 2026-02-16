// GoMate Mock Data - 深圳徒步地点和组队信息

export interface Location {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  coverImage: string;
  images: string[];
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme';
  duration: string;
  distance: string;
  elevation: string;
  bestSeason: string[];
  tags: string[];
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  routeGuide: {
    overview: string;
    waypoints: {
      name: string;
      description: string;
      distance: string;
    }[];
    tips: string[];
    warnings: string[];
  };
  facilities: {
    parking: boolean;
    restroom: boolean;
    water: boolean;
    food: boolean;
  };
}

export interface Team {
  id: string;
  locationId: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  maxMembers: number;
  currentMembers: number;
  requirements: string[];
  leader: {
    id: string;
    name: string;
    avatar: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    completedHikes: number;
    bio: string;
  };
  status: 'open' | 'full' | 'closed';
  createdAt: string;
}

// 难度标签映射
export const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: '简单', color: 'bg-emerald-100 text-emerald-700' },
  moderate: { label: '中等', color: 'bg-amber-100 text-amber-700' },
  hard: { label: '困难', color: 'bg-orange-100 text-orange-700' },
  extreme: { label: '极难', color: 'bg-red-100 text-red-700' },
};

// 领队等级映射
export const leaderLevelLabels: Record<string, string> = {
  beginner: '初级领队',
  intermediate: '中级领队',
  advanced: '高级领队',
  expert: '资深领队',
};

// 深圳徒步地点数据
export const locations: Location[] = [
  {
    id: 'qiniangshan',
    name: '七娘山',
    subtitle: '深圳第二高峰',
    description: '七娘山位于大鹏半岛南端，是深圳第二高峰，主峰海拔869米。山势险峻、雄伟，山中奇峰异石、岩洞、山泉、密林交相辉映。登高望远，可将大鹏半岛海景尽收眼底，是深圳户外爱好者的必登之地。',
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&h=600&fit=crop',
    ],
    difficulty: 'hard',
    duration: '6-8小时',
    distance: '12公里',
    elevation: '869米',
    bestSeason: ['春季', '秋季', '冬季'],
    tags: ['海景', '山峰', '摄影', '挑战'],
    location: {
      address: '深圳市大鹏新区南澳街道',
      coordinates: { lat: 22.4523, lng: 114.5321 },
    },
    routeGuide: {
      overview: '七娘山环线是经典徒步路线，从地质公园出发，经主峰后从另一侧下山，全程约12公里。',
      waypoints: [
        { name: '地质公园入口', description: '起点，有停车场和洗手间', distance: '0km' },
        { name: '一号观景台', description: '可远眺大鹏湾', distance: '2.5km' },
        { name: '七娘山主峰', description: '深圳第二高峰，360度海景', distance: '5km' },
        { name: '三角山', description: '次高峰，视野开阔', distance: '7km' },
        { name: '杨梅坑方向出口', description: '终点，可乘坐公交返回', distance: '12km' },
      ],
      tips: [
        '建议携带登山杖，部分路段较陡',
        '山顶风大，记得带防风外套',
        '全程无补给，需自备充足水和食物',
        '建议早上7点前出发，避免摸黑下山',
      ],
      warnings: [
        '雷雨天气严禁登山',
        '部分路段无手机信号',
        '不要独自前往，建议组队',
      ],
    },
    facilities: {
      parking: true,
      restroom: true,
      water: false,
      food: false,
    },
  },
  {
    id: 'wutongshan',
    name: '梧桐山',
    subtitle: '深圳第一高峰',
    description: '梧桐山位于深圳东部，主峰大梧桐海拔943.7米，是深圳最高峰。这里山势巍峨，森林茂密，是深圳市民最喜爱的登山目的地之一。从山顶可俯瞰深圳市区和香港新界，景色壮观。',
    coverImage: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop',
    ],
    difficulty: 'moderate',
    duration: '4-6小时',
    distance: '10公里',
    elevation: '943米',
    bestSeason: ['全年'],
    tags: ['城市景观', '森林', '日出', '热门'],
    location: {
      address: '深圳市罗湖区梧桐山村',
      coordinates: { lat: 22.5836, lng: 114.2165 },
    },
    routeGuide: {
      overview: '梧桐山有多条登山路线，最经典的是从梧桐山村出发，经好汉坡登顶，全程约10公里。',
      waypoints: [
        { name: '梧桐山村入口', description: '主要登山口，设施完善', distance: '0km' },
        { name: '凤凰台', description: '中途休息点，有洗手间', distance: '3km' },
        { name: '好汉坡', description: '最陡峭路段，挑战体力', distance: '5km' },
        { name: '大梧桐主峰', description: '深圳最高峰，鹏城第一峰', distance: '6km' },
        { name: '泰山涧', description: '下山路线，溪流相伴', distance: '10km' },
      ],
      tips: [
        '周末人多，建议早出发',
        '好汉坡较陡，量力而行',
        '山顶有补给点但价格较高',
        '想看日出需凌晨3点开始登山',
      ],
      warnings: [
        '节假日人流量大，注意安全',
        '夜间登山需带头灯',
        '不要偏离指定路线',
      ],
    },
    facilities: {
      parking: true,
      restroom: true,
      water: true,
      food: true,
    },
  },
  {
    id: 'dongxichong',
    name: '东西冲',
    subtitle: '最美海岸线',
    description: '东西冲穿越是深圳最经典的海岸线徒步路线，从东冲沙滩到西冲沙滩，全长约8公里。沿途可欣赏深圳最美的海岸风光，包括海蚀崖、海蚀洞、海蚀平台等地质奇观，被誉为"中国最美八大海岸线"之一。',
    coverImage: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1437719417032-8595fd9e9dc6?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop',
    ],
    difficulty: 'moderate',
    duration: '5-7小时',
    distance: '8公里',
    elevation: '200米',
    bestSeason: ['秋季', '冬季', '春季'],
    tags: ['海岸线', '沙滩', '摄影', '亲子'],
    location: {
      address: '深圳市大鹏新区南澳街道',
      coordinates: { lat: 22.4567, lng: 114.5234 },
    },
    routeGuide: {
      overview: '东西冲穿越是深圳最受欢迎的海岸线路线，沿途需要攀爬礁石、穿越沙滩，风景绝美。',
      waypoints: [
        { name: '东冲沙滩', description: '起点，可停车', distance: '0km' },
        { name: '鬼仔角', description: '第一个海蚀崖观景点', distance: '2km' },
        { name: '穿鼻岩', description: '标志性景点，需攀爬', distance: '4km' },
        { name: '西冲四号沙滩', description: '终点，可游泳休息', distance: '8km' },
      ],
      tips: [
        '穿防滑鞋，礁石湿滑',
        '带手套，需要手脚并用',
        '注意潮汐时间，涨潮时部分路段无法通行',
        '沿途有快艇可紧急撤离',
      ],
      warnings: [
        '雨天路滑，不建议前往',
        '注意防晒，海边紫外线强',
        '不要单独行动',
      ],
    },
    facilities: {
      parking: true,
      restroom: true,
      water: true,
      food: true,
    },
  },
  {
    id: 'maluanshan',
    name: '马峦山',
    subtitle: '瀑布群秘境',
    description: '马峦山位于深圳坪山区，以瀑布群闻名。这里有深圳最大的瀑布群，最大的瀑布落差达30米。山中植被茂密，溪流潺潺，是深圳难得的清幽之地，非常适合周末休闲徒步。',
    coverImage: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
    ],
    difficulty: 'easy',
    duration: '3-4小时',
    distance: '6公里',
    elevation: '400米',
    bestSeason: ['夏季', '秋季'],
    tags: ['瀑布', '溪流', '休闲', '亲子'],
    location: {
      address: '深圳市坪山区马峦街道',
      coordinates: { lat: 22.6789, lng: 114.3456 },
    },
    routeGuide: {
      overview: '马峦山有多条路线，最经典的是从北门进入，经瀑布群后从西北门出，全程约6公里。',
      waypoints: [
        { name: '马峦山北门', description: '主要入口，有停车场', distance: '0km' },
        { name: '碧岭瀑布', description: '第一个瀑布，落差约15米', distance: '1.5km' },
        { name: '马峦大瀑布', description: '最大瀑布，落差30米', distance: '3km' },
        { name: '红花岭', description: '山顶平台，可远眺', distance: '4.5km' },
        { name: '西北门', description: '出口，可乘公交', distance: '6km' },
      ],
      tips: [
        '雨后瀑布水量更大，景色更佳',
        '可带泳衣，部分水潭可游泳',
        '夏季蚊虫多，带好驱蚊水',
        '适合带小朋友，路线较轻松',
      ],
      warnings: [
        '瀑布附近石头湿滑，小心行走',
        '不要攀爬瀑布',
        '注意保护水源，不要乱扔垃圾',
      ],
    },
    facilities: {
      parking: true,
      restroom: true,
      water: true,
      food: false,
    },
  },
  {
    id: 'tanglangshan',
    name: '塘朗山',
    subtitle: '城市绿肺',
    description: '塘朗山位于深圳南山区，是市中心的一片绿洲。主峰海拔430米，可俯瞰深圳湾和香港。这里交通便利，是深圳市民日常锻炼和周末休闲的好去处，特别适合初次尝试徒步的新手。',
    coverImage: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1511497584788-876760111969?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&h=600&fit=crop',
    ],
    difficulty: 'easy',
    duration: '2-3小时',
    distance: '5公里',
    elevation: '430米',
    bestSeason: ['全年'],
    tags: ['城市', '休闲', '观景', '新手'],
    location: {
      address: '深圳市南山区龙珠六路',
      coordinates: { lat: 22.5567, lng: 113.9789 },
    },
    routeGuide: {
      overview: '塘朗山路线简单明了，从龙珠门进入，沿盘山公路或石阶路登顶，适合各年龄段。',
      waypoints: [
        { name: '龙珠门入口', description: '主入口，地铁可达', distance: '0km' },
        { name: '百尺天梯', description: '石阶路段，稍有挑战', distance: '2km' },
        { name: '塘朗山顶', description: '观景平台，俯瞰深圳湾', distance: '3km' },
        { name: '茶香径', description: '下山步道，林荫遮蔽', distance: '5km' },
      ],
      tips: [
        '地铁7号线桃源村站D出口直达',
        '可带宠物，需牵绳',
        '山顶有自动售货机',
        '傍晚可看日落和城市夜景',
      ],
      warnings: [
        '周末人流量大',
        '夜间照明有限',
        '注意野猪出没（罕见）',
      ],
    },
    facilities: {
      parking: true,
      restroom: true,
      water: true,
      food: false,
    },
  },
];

// 组队数据
export const teams: Team[] = [
  // 七娘山队伍
  {
    id: 'team-1',
    locationId: 'qiniangshan',
    title: '七娘山挑战队 - 周六登顶看海',
    description: '本周六计划挑战七娘山，看绝美海景。目前已有3人，再找2-3位伙伴一起。要求有一定体力基础，不恐高。',
    date: '2026-02-22',
    time: '07:00',
    duration: '7小时',
    maxMembers: 6,
    currentMembers: 3,
    requirements: ['有徒步经验', '体能较好', '自备装备'],
    leader: {
      id: 'user-1',
      name: '山野行者',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      level: 'advanced',
      completedHikes: 47,
      bio: '资深户外爱好者，深圳百山打卡进行中，擅长路线规划和安全保障。',
    },
    status: 'open',
    createdAt: '2026-02-15',
  },
  {
    id: 'team-2',
    locationId: 'qiniangshan',
    title: '七娘山摄影小队 - 日出专线',
    description: '周日清晨出发，登顶拍摄七娘山日出和云海。携带无人机和相机，欢迎摄影爱好者加入。',
    date: '2026-02-23',
    time: '05:30',
    duration: '8小时',
    maxMembers: 4,
    currentMembers: 4,
    requirements: ['摄影爱好者', '能早起', '有头灯'],
    leader: {
      id: 'user-2',
      name: '光影猎人',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
      level: 'expert',
      completedHikes: 82,
      bio: '风光摄影师，专注山海摄影，熟悉深圳各大观景点最佳拍摄时机。',
    },
    status: 'full',
    createdAt: '2026-02-14',
  },
  {
    id: 'team-3',
    locationId: 'qiniangshan',
    title: '新手友好 - 七娘山慢摇队',
    description: '慢节奏登山，不赶路，享受风景。适合第一次爬七娘山的朋友，领队会详细讲解路线和安全知识。',
    date: '2026-02-22',
    time: '08:00',
    duration: '8小时',
    maxMembers: 8,
    currentMembers: 2,
    requirements: ['新手友好', '听从指挥', '准时集合'],
    leader: {
      id: 'user-3',
      name: '暖心领队',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      level: 'intermediate',
      completedHikes: 23,
      bio: '热爱分享，擅长带领新手入门，注重团队安全和体验。',
    },
    status: 'open',
    createdAt: '2026-02-16',
  },
  // 梧桐山队伍
  {
    id: 'team-4',
    locationId: 'wutongshan',
    title: '梧桐山夜爬 - 看城市日出',
    description: '周六凌晨夜爬梧桐山，在山顶看深圳最美日出。夜爬别有一番风味，欢迎胆大心细的朋友加入。',
    date: '2026-02-22',
    time: '04:00',
    duration: '5小时',
    maxMembers: 10,
    currentMembers: 6,
    requirements: ['有夜爬经验', '带头灯', '保暖衣物'],
    leader: {
      id: 'user-4',
      name: '夜行侠',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      level: 'advanced',
      completedHikes: 56,
      bio: '夜爬达人，熟悉梧桐山每一条夜路，保证安全看日出。',
    },
    status: 'open',
    createdAt: '2026-02-15',
  },
  {
    id: 'team-5',
    locationId: 'wutongshan',
    title: '梧桐山亲子徒步队',
    description: '周日带小朋友一起爬梧桐山，走较轻松的泰山涧路线。培养小朋友热爱自然、坚持锻炼的好习惯。',
    date: '2026-02-23',
    time: '09:00',
    duration: '5小时',
    maxMembers: 5,
    currentMembers: 3,
    requirements: ['带6岁以上儿童', '家长陪同', '准备零食'],
    leader: {
      id: 'user-5',
      name: '超级奶爸',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
      level: 'intermediate',
      completedHikes: 31,
      bio: '两个孩子的爸爸，经常带孩子户外活动，擅长亲子路线规划。',
    },
    status: 'open',
    createdAt: '2026-02-16',
  },
  // 东西冲队伍
  {
    id: 'team-6',
    locationId: 'dongxichong',
    title: '东西冲穿越 - 海岸线探险',
    description: '周日东西冲穿越，体验深圳最美海岸线。需要一定体力，会经过礁石攀爬路段，刺激又好玩。',
    date: '2026-02-23',
    time: '08:30',
    duration: '6小时',
    maxMembers: 8,
    currentMembers: 5,
    requirements: ['防滑鞋', '手套', '不怕晒'],
    leader: {
      id: 'user-6',
      name: '海之子',
      avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop&crop=face',
      level: 'advanced',
      completedHikes: 68,
      bio: '海洋爱好者，熟悉大鹏半岛所有海岸线，擅长潮汐判断和路线选择。',
    },
    status: 'open',
    createdAt: '2026-02-14',
  },
  {
    id: 'team-7',
    locationId: 'dongxichong',
    title: '东西冲摄影团 - 日落专线',
    description: '下午出发，在东西冲拍摄日落和星空。适合喜欢慢节奏、爱拍照的朋友。',
    date: '2026-02-22',
    time: '14:00',
    duration: '6小时',
    maxMembers: 6,
    currentMembers: 6,
    requirements: ['摄影器材', '三脚架', '头灯'],
    leader: {
      id: 'user-7',
      name: '星空摄影师',
      avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop&crop=face',
      level: 'expert',
      completedHikes: 93,
      bio: '专业摄影师，擅长星空和海景摄影，作品多次获奖。',
    },
    status: 'full',
    createdAt: '2026-02-13',
  },
  // 马峦山队伍
  {
    id: 'team-8',
    locationId: 'maluanshan',
    title: '马峦山瀑布探秘 - 休闲局',
    description: '周六马峦山看瀑布，路线轻松，适合新手和想放松的朋友。可以带泳衣在水潭玩水。',
    date: '2026-02-22',
    time: '09:30',
    duration: '4小时',
    maxMembers: 10,
    currentMembers: 4,
    requirements: ['休闲装备', '可带泳衣', '防蚊液'],
    leader: {
      id: 'user-8',
      name: '快乐行者',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
      level: 'intermediate',
      completedHikes: 28,
      bio: '性格开朗，喜欢结交新朋友，擅长组织轻松愉快的户外活动。',
    },
    status: 'open',
    createdAt: '2026-02-15',
  },
  // 塘朗山队伍
  {
    id: 'team-9',
    locationId: 'tanglangshan',
    title: '塘朗山晨爬 - 开启活力一天',
    description: '周日早上塘朗山晨练，轻松登顶后下山吃早餐。适合住在附近的朋友，养成运动好习惯。',
    date: '2026-02-23',
    time: '06:30',
    duration: '2.5小时',
    maxMembers: 6,
    currentMembers: 2,
    requirements: ['准时', '轻松装备'],
    leader: {
      id: 'user-9',
      name: '晨练达人',
      avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=100&h=100&fit=crop&crop=face',
      level: 'intermediate',
      completedHikes: 35,
      bio: '坚持晨爬3年，熟悉塘朗山每一条小路，欢迎加入晨练队伍。',
    },
    status: 'open',
    createdAt: '2026-02-16',
  },
  {
    id: 'team-10',
    locationId: 'tanglangshan',
    title: '塘朗山夜爬观星',
    description: '周五晚上塘朗山夜爬，山顶看城市夜景和星空。路线安全，适合下班后放松。',
    date: '2026-02-21',
    time: '19:30',
    duration: '2小时',
    maxMembers: 8,
    currentMembers: 7,
    requirements: ['头灯', '晚上有空'],
    leader: {
      id: 'user-10',
      name: '星空漫步',
      avatar: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=100&h=100&fit=crop&crop=face',
      level: 'beginner',
      completedHikes: 15,
      bio: '天文爱好者，喜欢带朋友看星星，讲解星座知识。',
    },
    status: 'open',
    createdAt: '2026-02-14',
  },
];

// 辅助函数
export function getLocationById(id: string): Location | undefined {
  return locations.find((loc) => loc.id === id);
}

export function getTeamsByLocationId(locationId: string): Team[] {
  return teams.filter((team) => team.locationId === locationId);
}

export function getTeamById(id: string): Team | undefined {
  return teams.find((team) => team.id === id);
}

export function getLocationByTeamId(teamId: string): Location | undefined {
  const team = getTeamById(teamId);
  if (!team) return undefined;
  return getLocationById(team.locationId);
}
