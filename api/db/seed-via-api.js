#!/usr/bin/env node

/**
 * 通过 API 注册测试用户并创建测试数据
 * 
 * 使用方法：
 * node api/db/seed-via-api.js
 * 
 * 环境要求：
 * - 后端服务已启动（http://localhost:8799）
 * - 管理员账号已创建（第一个注册的用户）
 */

const API_BASE = 'http://localhost:8799';

const TEST_USERS = [
  {
    email: 'admin@test.com',
    password: 'test1234',
    name: '系统管理员',
    nickname: 'Admin',
    bio: 'GoMate 平台管理员，负责维护平台内容',
    level: 'expert',
    role: 'admin',
    wechat: 'admin_wechat',
    completedHikes: 50,
  },
  {
    email: 'leader_a@test.com',
    password: 'test1234',
    name: '张登山',
    nickname: '登山达人',
    bio: '热爱户外徒步，每周组织一次徒步活动',
    level: 'advanced',
    wechat: 'leader_a_wechat',
    completedHikes: 25,
  },
  {
    email: 'leader_b@test.com',
    password: 'test1234',
    name: '李户外',
    nickname: '户外探险家',
    bio: '专业户外领队，10年徒步经验',
    level: 'expert',
    wechat: 'leader_b_wechat',
    completedHikes: 100,
  },
  {
    email: 'member_a@test.com',
    password: 'test1234',
    name: '王新手',
    nickname: '徒步新人',
    bio: '刚接触徒步，希望学习更多技巧',
    level: 'beginner',
    wechat: 'member_a_wechat',
    completedHikes: 2,
  },
  {
    email: 'member_b@test.com',
    password: 'test1234',
    name: '陈徒步',
    nickname: '徒步爱好者',
    bio: '喜欢周末徒步，探索深圳的各个角落',
    level: 'intermediate',
    wechat: 'member_b_wechat',
    completedHikes: 15,
  },
  {
    email: 'expert@test.com',
    password: 'test1234',
    name: '资深达人',
    nickname: 'Expert Hiker',
    bio: '5年徒步经验，完成过100+次徒步',
    level: 'expert',
    wechat: 'expert_wechat',
    completedHikes: 100,
  },
  {
    email: 'beginner@test.com',
    password: 'test1234',
    name: '新手小白',
    nickname: 'Beginner',
    bio: '第一次参加徒步活动',
    level: 'beginner',
    wechat: 'beginner_wechat',
    completedHikes: 0,
  },
];

const TEST_LOCATIONS = [
  {
    name: '清水湾',
    slug: 'qingshuiwan',
    type: 'hiking',
    subtitle: '深圳南山的海边秘境',
    description: '清水湾位于深圳南山区，是一处隐藏的海边徒步胜地。沿着海岸线漫步，可以欣赏到壮丽的海景，感受海风拂面的惬意。',
    address: '深圳市南山区清水湾',
    cityId: 'city_sz',
    cityName: '深圳',
    bestSeason: ['春季', '秋季'],
    coverImage: 'https://gomate.cos.jiahongw.com/demo/qingshuiwan-cover.jpg',
    images: ['https://gomate.cos.jiahongw.com/demo/qingshuiwan-1.jpg'],
    coordinates: { lat: 22.5, lng: 113.9 },
  },
  {
    name: '梧桐山',
    slug: 'wutongshan',
    type: 'hiking',
    subtitle: '深圳第一高峰',
    description: '梧桐山是深圳第一高峰，海拔943.7米。山顶视野开阔，可以俯瞰整个深圳和香港。',
    address: '深圳市盐田区梧桐山',
    cityId: 'city_sz',
    cityName: '深圳',
    bestSeason: ['春季', '冬季'],
    coverImage: 'https://gomate.cos.jiahongw.com/demo/wutongshan-cover.jpg',
    images: ['https://gomate.cos.jiahongw.com/demo/wutongshan-1.jpg'],
    coordinates: { lat: 22.6, lng: 114.2 },
  },
];

const TEST_ROUTES = [
  {
    locationId: 'loc_qingshuiwan',
    cityId: 'city_sz',
    name: '清水湾海岸线徒步',
    description: '沿着清水湾海岸线漫步，欣赏海景，体验海风拂面。',
    difficulty: 'easy',
    durationMin: 60,
    durationMax: 90,
    distance: 3.5,
    elevation: 50,
  },
  {
    locationId: 'loc_wutongshan',
    cityId: 'city_sz',
    name: '梧桐山轻松线',
    description: '梧桐山的入门路线，适合新手和亲子徒步。',
    difficulty: 'easy',
    durationMin: 120,
    durationMax: 150,
    distance: 5,
    elevation: 200,
  },
];

const TEST_TEAMS = [
  {
    locationId: 'loc_qingshuiwan',
    routeId: 'route_qingshuiwan_coast',
    title: '周末清水湾海岸线徒步',
    description: '本周六一起去清水湾徒步，感受海风拂面的惬意，适合新手参加。',
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    durationMin: 90,
    maxMembers: 6,
    requirements: ['防晒霜', '防滑鞋', '充足的水'],
    icon: '🌊',
  },
  {
    locationId: 'loc_wutongshan',
    routeId: 'route_wutongshan_easy',
    title: '梧桐山轻松线体验',
    description: '梧桐山入门路线，适合新手和家庭，路线平缓风景优美。',
    startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    durationMin: 150,
    maxMembers: 8,
    requirements: ['登山鞋', '水', '零食'],
    icon: '⛰️',
  },
];

let adminCookie = '';

async function healthCheck() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    console.log(`✓ API health check: ${data.status}`);
    return true;
  } catch (error) {
    console.error('✗ API health check failed:', error.message);
    return false;
  }
}

async function registerUser(user) {
  try {
    const res = await fetch(`${API_BASE}/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        name: user.name,
      }),
    });
    
    if (!res.ok) {
      const error = await res.json();
      if (error.message?.includes('already exists')) {
        console.log(`  User ${user.email} already exists, skipping registration`);
        return true;
      }
      throw new Error(error.message || 'Registration failed');
    }
    
    console.log(`✓ Registered user: ${user.email}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to register ${user.email}:`, error.message);
    return false;
  }
}

async function loginUser(email, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Login failed');
    }
    
    const cookie = res.headers.get('set-cookie');
    if (cookie) {
      adminCookie = cookie;
    }
    
    const data = await res.json();
    console.log(`✓ Logged in as: ${email} (user ID: ${data.user?.id})`);
    return data.user;
  } catch (error) {
    console.error(`✗ Failed to login ${email}:`, error.message);
    return null;
  }
}

async function updateUser(userId, updates) {
  try {
    const res = await fetch(`${API_BASE}/users/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
      },
      body: JSON.stringify({ userId, ...updates }),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Update failed');
    }
    
    console.log(`✓ Updated user: ${userId} (${updates.nickname || updates.name})`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to update user ${userId}:`, error.message);
    return false;
  }
}

async function createCity(city) {
  try {
    const res = await fetch(`${API_BASE}/cities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
      },
      body: JSON.stringify(city),
    });
    
    if (!res.ok) {
      const error = await res.json();
      if (error.message?.includes('already exists')) {
        console.log(`  City ${city.name} already exists`);
        return true;
      }
      throw new Error(error.message || 'Create city failed');
    }
    
    const data = await res.json();
    console.log(`✓ Created city: ${city.name} (ID: ${data.city?.id})`);
    return data.city;
  } catch (error) {
    console.error(`✗ Failed to create city ${city.name}:`, error.message);
    return null;
  }
}

async function createLocation(location) {
  try {
    const res = await fetch(`${API_BASE}/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
      },
      body: JSON.stringify(location),
    });
    
    if (!res.ok) {
      const error = await res.json();
      if (error.message?.includes('already exists')) {
        console.log(`  Location ${location.name} already exists`);
        return true;
      }
      throw new Error(error.message || 'Create location failed');
    }
    
    const data = await res.json();
    console.log(`✓ Created location: ${location.name} (ID: ${data.location?.id})`);
    return data.location;
  } catch (error) {
    console.error(`✗ Failed to create location ${location.name}:`, error.message);
    return null;
  }
}

async function createRoute(route) {
  try {
    const res = await fetch(`${API_BASE}/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
      },
      body: JSON.stringify(route),
    });
    
    if (!res.ok) {
      const error = await res.json();
      if (error.message?.includes('already exists')) {
        console.log(`  Route ${route.name} already exists`);
        return true;
      }
      throw new Error(error.message || 'Create route failed');
    }
    
    const data = await res.json();
    console.log(`✓ Created route: ${route.name} (ID: ${data.route?.id})`);
    return data.route;
  } catch (error) {
    console.error(`✗ Failed to create route ${route.name}:`, error.message);
    return null;
  }
}

async function createTeam(team) {
  try {
    const res = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
      },
      body: JSON.stringify(team),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Create team failed');
    }
    
    const data = await res.json();
    console.log(`✓ Created team: ${team.title} (ID: ${data.team?.id})`);
    return data.team;
  } catch (error) {
    console.error(`✗ Failed to create team ${team.title}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('\n=== GoMate Mobile Test Data Seed Script ===\n');
  
  // Step 1: Health check
  const healthy = await healthCheck();
  if (!healthy) {
    console.error('\nPlease start the backend server first: pnpm api:dev');
    process.exit(1);
  }
  
  // Step 2: Register all users
  console.log('\n=== Registering Users ===');
  for (const user of TEST_USERS) {
    await registerUser(user);
  }
  
  // Step 3: Login as admin to get session cookie
  console.log('\n=== Logging in Admin ===');
  const adminUser = await loginUser(TEST_USERS[0].email, TEST_USERS[0].password);
  if (!adminUser) {
    console.error('\nFailed to login admin. Cannot proceed with data creation.');
    process.exit(1);
  }
  
  // Step 4: Update user profiles
  console.log('\n=== Updating User Profiles ===');
  for (const user of TEST_USERS) {
    // Login as each user to update their profile
    const loggedInUser = await loginUser(user.email, user.password);
    if (loggedInUser) {
      await updateUser(loggedInUser.id, {
        nickname: user.nickname,
        bio: user.bio,
        level: user.level,
        wechat: user.wechat,
        completedHikes: user.completedHikes,
      });
    }
  }
  
  // Step 5: Re-login as admin for creating locations/routes
  console.log('\n=== Logging in Admin for Data Creation ===');
  await loginUser(TEST_USERS[0].email, TEST_USERS[0].password);
  
  // Step 6: Create cities
  console.log('\n=== Creating Cities ===');
  const cities = [
    {
      id: 'city_sz',
      adcode: '440300',
      name: '深圳',
      pinyin: 'shenzhen',
      province: '广东省',
      level: 'city',
      isHot: true,
    },
    {
      id: 'city_gz',
      adcode: '440100',
      name: '广州',
      pinyin: 'guangzhou',
      province: '广东省',
      level: 'city',
      isHot: true,
    },
  ];
  
  for (const city of cities) {
    await createCity(city);
  }
  
  // Step 7: Create locations
  console.log('\n=== Creating Locations ===');
  const createdLocations = [];
  for (const location of TEST_LOCATIONS) {
    const loc = await createLocation({
      ...location,
      id: location.slug === 'qingshuiwan' ? 'loc_qingshuiwan' : 'loc_wutongshan',
    });
    if (loc) createdLocations.push(loc);
  }
  
  // Step 8: Create routes
  console.log('\n=== Creating Routes ===');
  const createdRoutes = [];
  for (const route of TEST_ROUTES) {
    const r = await createRoute({
      ...route,
      id: route.name === '清水湾海岸线徒步' ? 'route_qingshuiwan_coast' : 'route_wutongshan_easy',
    });
    if (r) createdRoutes.push(r);
  }
  
  // Step 9: Create teams (login as leader users)
  console.log('\n=== Creating Teams ===');
  for (const team of TEST_TEAMS) {
    // Login as leader_a to create teams
    await loginUser(TEST_USERS[1].email, TEST_USERS[1].password);
    await createTeam(team);
  }
  
  // Final summary
  console.log('\n=== Seed Complete ===');
  console.log('\nTest Accounts Summary:');
  console.log('===========================================');
  console.log('Email                     | Role     | Level      | Password');
  console.log('-------------------------------------------');
  for (const user of TEST_USERS) {
    console.log(`${user.email.padEnd(25)} | ${user.role || 'user'.padEnd(8)} | ${(user.level || 'beginner').padEnd(10)} | test1234`);
  }
  console.log('===========================================');
  console.log('\nAll passwords are: test1234');
  console.log('You can now test the mobile app with these accounts!');
}

main().catch(console.error);