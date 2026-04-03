#!/usr/bin/env node

/**
 * GoMate 移动端调试测试数据创建脚本
 * 
 * 用途：创建用于调试安卓移动端应用的测试用户和数据
 * 使用：node scripts/create-mobile-test-data.js
 */

const API_BASE_URL = 'http://localhost:8799';

// 测试用户定义（覆盖所有用户等级和角色）
const testUsers = [
  {
    email: 'test_beginner_1@gomate.dev',
    password: 'Test123456!',
    name: '徒步新手张三',
    level: 'beginner',
    bio: '刚入门的徒步爱好者，喜欢轻松的路线',
    gender: 'male',
  },
  {
    email: 'test_beginner_2@gomate.dev',
    password: 'Test123456!',
    name: '户外小白李四',
    level: 'beginner',
    bio: '第一次尝试徒步，希望找到友好的队伍',
    gender: 'female',
  },
  {
    email: 'test_intermediate_1@gomate.dev',
    password: 'Test123456!',
    name: '进阶徒步者王五',
    level: 'intermediate',
    bio: '有一定徒步经验，周末经常爬山',
    gender: 'male',
  },
  {
    email: 'test_intermediate_2@gomate.dev',
    password: 'Test123456!',
    name: '徒步爱好者赵六',
    level: 'intermediate',
    bio: '喜欢探索深圳周边路线',
    gender: 'female',
  },
  {
    email: 'test_advanced_1@gomate.dev',
    password: 'Test123456!',
    name: '资深驴友钱七',
    level: 'advanced',
    bio: '三年徒步经验，走过深圳大部分路线',
    gender: 'male',
  },
  {
    email: 'test_expert_1@gomate.dev',
    password: 'Test123456!',
    name: '户外大神周八',
    level: 'expert',
    bio: '五年以上户外经验，擅长组织长线徒步',
    gender: 'female',
  },
  {
    email: 'test_admin_1@gomate.dev',
    password: 'Test123456!',
    name: '管理员测试',
    level: 'expert',
    role: 'admin',
    bio: 'GoMate 平台测试管理员',
    gender: 'other',
  },
];

// 测试队伍定义（覆盖不同状态和难度）
const testTeams = [
  {
    title: '梧桐山入门级徒步 - 新手友好',
    locationSlug: 'wutong-mountain',
    description: '适合新手的梧桐山轻松路线，全程约 3 小时，有老驴带队。',
    date: '2026-04-10',
    time: '09:00',
    durationMin: 180,
    maxMembers: 8,
    icon: '🌿',
    requirements: ['能连续行走 2 小时', '穿运动鞋', '带足够的水'],
    difficulty: 'easy',
  },
  {
    title: '七娘山中级挑战 - 看海观景',
    locationSlug: 'qiniang-mountain',
    description: '攀登深圳第二高峰，俯瞰大鹏半岛海景，适合有一定经验的徒步者。',
    date: '2026-04-11',
    time: '07:30',
    durationMin: 360,
    maxMembers: 10,
    icon: '⛰️',
    requirements: ['有徒步经验', '能连续登山 4 小时', '带登山杖'],
    difficulty: 'moderate',
  },
  {
    title: '东西涌海岸线穿越 - 海岸风光',
    locationSlug: 'dongxichong',
    description: '中国最美海岸线穿越，沿途欣赏海蚀地貌和礁石景观。',
    date: '2026-04-12',
    time: '08:00',
    durationMin: 300,
    maxMembers: 12,
    icon: '🌊',
    requirements: ['穿防滑鞋', '带手套', '不怕晒'],
    difficulty: 'moderate',
  },
  {
    title: '梅沙尖日出摄影 - 云海日出',
    locationSlug: 'meishajian',
    description: '清晨登顶梅沙尖，观赏壮丽云海日出，摄影爱好者的绝佳选择。',
    date: '2026-04-13',
    time: '05:00',
    durationMin: 300,
    maxMembers: 6,
    icon: '📸',
    requirements: ['能早起', '有摄影器材', '体能较好'],
    difficulty: 'hard',
  },
  {
    title: '大雁顶进阶挑战 - 深圳第三高峰',
    locationSlug: 'dayanding',
    description: '挑战深圳第三高峰，全程山野路，需要较好的体能和户外经验。',
    date: '2026-04-14',
    time: '07:00',
    durationMin: 420,
    maxMembers: 8,
    icon: '🥾',
    requirements: ['有丰富徒步经验', '能连续登山 6 小时', '自备路餐'],
    difficulty: 'hard',
  },
  {
    title: '马峦山亲子溯溪 - 家庭休闲',
    locationSlug: 'maluan-mountain',
    description: '轻松愉快的亲子溯溪路线，沿途观赏瀑布群，适合全家参与。',
    date: '2026-04-15',
    time: '09:30',
    durationMin: 240,
    maxMembers: 15,
    icon: '👨‍👩‍👧‍👦',
    requirements: ['带小朋友', '带换洗衣物', '注意防晒'],
    difficulty: 'easy',
  },
];

// 用户等级显示名称
const levelNames = {
  beginner: '入门级',
  intermediate: '进阶级',
  advanced: '资深级',
  expert: '专家级',
};

/**
 * 执行 API 请求
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    return { response, data };
  } catch (error) {
    console.error(`API 请求失败：${endpoint}`, error.message);
    throw error;
  }
}

/**
 * 注册新用户
 */
async function registerUser(userData) {
  console.log(`正在注册：${userData.email} (${userData.name})...`);
  
  try {
    const { data } = await apiRequest('/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        name: userData.name,
      }),
    });
    
    const userId = data.user?.id;
    if (!userId) {
      throw new Error('未能获取用户 ID');
    }
    
    // 更新用户资料（等级、性别、简介）
    await updateUserProfile(userData.email, userData.password, {
      level: userData.level,
      gender: userData.gender,
      bio: userData.bio,
      role: userData.role || 'user',
    });
    
    console.log(`✓ 用户注册成功：${userData.name} (ID: ${userId}, 等级：${levelNames[userData.level]})`);
    return userId;
  } catch (error) {
    if (error.message.includes('该邮箱已注册')) {
      console.log(`⚠ 用户已存在：${userData.email}`);
      return null;
    }
    throw error;
  }
}

/**
 * 更新用户资料
 */
async function updateUserProfile(email, password, profileData) {
  // 先登录获取 token
  const { data: loginData, response: loginResponse } = await apiRequest('/auth/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
    }),
  });
  
  // 从 Set-Cookie 头提取 token
  const setCookie = loginResponse.headers.get('set-cookie') || '';
  const tokenMatch = setCookie.match(/better-auth\.session_token=([^;]+)/);
  let token = tokenMatch ? tokenMatch[1] : null;
  
  // 如果 Cookie 中没有，尝试从响应体获取
  if (!token) {
    token = loginData.token || loginData.session?.token;
  }
  
  if (!token) {
    throw new Error('未能获取认证 token');
  }
  
  // 更新用户资料（需要 userId 参数）
  const userId = loginData.user?.id;
  await apiRequest('/user/update', {
    method: 'PATCH',
    headers: {
      Cookie: `better-auth.session_token=${token}`,
    },
    body: JSON.stringify({
      userId,
      ...profileData,
    }),
  });
}

/**
 * 获取地点信息
 */
async function getLocationBySlug(slug) {
  const { data } = await apiRequest('/locations');
  const location = data.locations?.find(loc => loc.slug === slug);
  return location;
}

/**
 * 创建测试队伍
 */
async function createTeam(teamData, leaderToken) {
  console.log(`正在创建队伍：${teamData.title}...`);
  
  // 获取路线信息（如果有指定）
  let routeId = null;
  
  const payload = {
    locationId: teamData.location.id,
    routeId: routeId,
    title: teamData.title,
    description: teamData.description,
    startTime: new Date(`${teamData.date}T${teamData.time}:00+08:00`).getTime(),
    endTime: new Date(`${teamData.date}T${teamData.time}:00+08:00`).getTime() + teamData.durationMin * 60 * 1000,
    durationMin: teamData.durationMin,
    maxMembers: teamData.maxMembers,
    icon: teamData.icon,
    requirements: teamData.requirements,
  };
  
  const { data } = await apiRequest('/teams', {
    method: 'POST',
    headers: {
      Cookie: `better-auth.session_token=${leaderToken}`,
    },
    body: JSON.stringify(payload),
  });
  
  console.log(`✓ 队伍创建成功：${teamData.title}`);
  return data.team?.id;
}

/**
 * 登录获取 token
 */
async function login(email, password) {
  const { data } = await apiRequest('/auth/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.session?.token;
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 GoMate 移动端测试数据创建工具\n');
  console.log('API 地址：', API_BASE_URL);
  console.log('='.repeat(60));
  
  const createdUsers = [];
  const tokens = {};
  
  // Step 1: 创建测试用户
  console.log('\n📝 Step 1: 创建测试用户...\n');
  
  for (const user of testUsers) {
    try {
      const userId = await registerUser(user);
      if (userId) {
        createdUsers.push({ ...user, id: userId });
        // 登录获取 token
        const token = await login(user.email, user.password);
        tokens[user.email] = token;
      }
    } catch (error) {
      console.error(`创建用户失败：${user.email}`, error.message);
    }
  }
  
  console.log(`\n✓ 用户创建完成，共创建 ${createdUsers.length} 个用户`);
  
  // Step 2: 创建测试队伍
  console.log('\n📝 Step 2: 创建测试队伍...\n');
  
  const locations = {};
  for (const team of testTeams) {
    // 获取地点信息
    if (!locations[team.locationSlug]) {
      locations[team.locationSlug] = await getLocationBySlug(team.locationSlug);
    }
    team.location = locations[team.locationSlug];
    
    if (!team.location) {
      console.error(`地点不存在：${team.locationSlug}`);
      continue;
    }
    
    // 选择一个合适的队长（根据难度选择对应等级的用户）
    let leaderEmail;
    switch (team.difficulty) {
      case 'easy':
        leaderEmail = 'test_intermediate_1@gomate.dev';
        break;
      case 'moderate':
        leaderEmail = 'test_advanced_1@gomate.dev';
        break;
      case 'hard':
        leaderEmail = 'test_expert_1@gomate.dev';
        break;
      default:
        leaderEmail = 'test_intermediate_1@gomate.dev';
    }
    
    const leaderToken = tokens[leaderEmail];
    if (!leaderToken) {
      console.error(`队长 token 不存在：${leaderEmail}`);
      continue;
    }
    
    await createTeam(team, leaderToken);
  }
  
  // 打印总结
  console.log('\n' + '='.repeat(60));
  console.log('✅ 测试数据创建完成！\n');
  
  console.log('📋 用户列表：');
  console.log('-'.repeat(60));
  createdUsers.forEach(user => {
    console.log(`  ${user.name} (${user.email})`);
    console.log(`    等级：${levelNames[user.level]} | 性别：${user.gender}`);
    console.log(`    密码：Test123456!`);
    console.log(`    简介：${user.bio}`);
    console.log();
  });
  
  console.log('📋 创建的队伍：');
  console.log('-'.repeat(60));
  testTeams.forEach(team => {
    console.log(`  ${team.icon} ${team.title}`);
    console.log(`    地点：${team.location?.name} | 难度：${team.difficulty}`);
    console.log(`    日期：${team.date} ${team.time} | 时长：${team.durationMin/60}小时`);
    console.log();
  });
  
  console.log('\n💡 使用提示：');
  console.log('  1. 使用上述账号密码登录安卓移动端应用');
  console.log('  2. 不同等级的用户可以体验不同的功能和内容');
  console.log('  3. 可以尝试加入队伍、创建队伍、收藏地点等操作');
  console.log('  4. 管理员账号可用于测试后台管理功能\n');
}

// 执行
main().catch(console.error);
