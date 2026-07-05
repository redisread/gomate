#!/usr/bin/env node
/**
 * Staging environment seed script
 *
 * 通过 staging API 灌入测试数据：
 * - 测试用户（含管理员、队长、普通成员）
 * - 城市
 * - 地点
 * - 路线
 * - 队伍
 *
 * 使用方法：
 *   pnpm seed:staging
 *
 * 环境要求：
 *   - staging API 已部署并可访问（默认 https://api-staging.gomate.live）
 *   - 当前机器网络可以访问 Cloudflare staging
 *   - 已登录 wrangler（用于执行 D1 SQL 设置 admin 角色）
 */

const API_BASE = process.env.STAGING_API_URL || "https://api-staging.gomate.live";
const STAGING_ORIGIN = process.env.STAGING_ORIGIN || "https://staging.gomate.live";
const D1_NAME = process.env.STAGING_D1_NAME || "gomate-db-staging";

const PASSWORD = "test1234";

const TEST_USERS = [
  {
    email: "admin-staging@gomate.test",
    password: PASSWORD,
    name: "Staging Admin",
    nickname: "管理员",
    bio: "GoMate staging 环境管理员",
    level: "expert",
    role: "admin",
    wechat: "admin_staging",
    completedHikes: 50,
  },
  {
    email: "leader-staging@gomate.test",
    password: PASSWORD,
    name: "Staging Leader",
    nickname: "队长",
    bio: "热爱户外徒步，经常在 staging 组织活动",
    level: "advanced",
    role: "user",
    wechat: "leader_staging",
    completedHikes: 30,
  },
  {
    email: "member-staging@gomate.test",
    password: PASSWORD,
    name: "Staging Member",
    nickname: "队员",
    bio: "刚接触徒步，喜欢参加活动",
    level: "beginner",
    role: "user",
    wechat: "member_staging",
    completedHikes: 3,
  },
];

const TEST_CITIES = [
  {
    adcode: "440300",
    name: "深圳",
    province: "广东省",
    level: "city",
    isHot: true,
  },
  {
    adcode: "440100",
    name: "广州",
    province: "广东省",
    level: "city",
    isHot: true,
  },
];

const TEST_LOCATIONS = [
  {
    name: "清水湾",
    slug: "qingshuiwan-staging",
    type: "hiking",
    subtitle: "深圳南山的海边秘境",
    description:
      "清水湾位于深圳南山区，是一处隐藏的海边徒步胜地。沿着海岸线漫步，可以欣赏到壮丽的海景。",
    address: "深圳市南山区清水湾",
    cityName: "深圳",
    bestSeason: ["春季", "秋季"],
    coverImage:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    ],
    coordinates: { lat: 22.5, lng: 113.9 },
  },
  {
    name: "梧桐山",
    slug: "wutongshan-staging",
    type: "hiking",
    subtitle: "深圳第一高峰",
    description:
      "梧桐山是深圳第一高峰，海拔943.7米。山顶视野开阔，可以俯瞰整个深圳和香港。",
    address: "深圳市盐田区梧桐山",
    cityName: "深圳",
    bestSeason: ["春季", "冬季"],
    coverImage:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    ],
    coordinates: { lat: 22.6, lng: 114.2 },
  },
];

const TEST_ROUTES = [
  {
    name: "清水湾海岸线徒步",
    description: "沿着清水湾海岸线漫步，欣赏海景，体验海风拂面。",
    difficulty: "easy",
    durationMin: 60,
    durationMax: 90,
    distance: 3.5,
    elevation: 50,
  },
  {
    name: "梧桐山轻松线",
    description: "梧桐山的入门路线，适合新手和亲子徒步。",
    difficulty: "easy",
    durationMin: 120,
    durationMax: 150,
    distance: 5,
    elevation: 200,
  },
];

const now = Date.now();
const startA = new Date(now + 3 * 24 * 60 * 60 * 1000);
const startB = new Date(now + 5 * 24 * 60 * 60 * 1000);

const toDateStr = (d) => d.toISOString().split("T")[0];
const toTimeStr = (d) => d.toISOString().split("T")[1].slice(0, 5);

let currentCookie = "";

async function apiRequest(method, path, body, requireAuth = false) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Origin: STAGING_ORIGIN,
  };
  if (requireAuth && currentCookie) {
    headers.Cookie = currentCookie;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    currentCookie = setCookie;
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { status: res.status, data, ok: res.ok };
}

async function signUpOrLogin(email, password, name) {
  let result = await apiRequest("POST", "/auth/sign-up/email", {
    email,
    password,
    name,
  });

  if (!result.ok && result.data?.message?.toLowerCase().includes("already")) {
    result = await apiRequest("POST", "/auth/sign-in/email", {
      email,
      password,
    });
  }

  if (!result.ok) {
    throw new Error(
      `Auth failed for ${email}: ${result.status} ${JSON.stringify(result.data)}`
    );
  }

  console.log(`✅ Auth OK: ${email}`);
  return result.data;
}

async function updateUser(userId, updates) {
  const result = await apiRequest(
    "PATCH",
    "/users/update",
    { userId, ...updates },
    true
  );
  if (!result.ok) {
    console.warn(
      `⚠️ Failed to update user ${userId}: ${result.status} ${JSON.stringify(result.data)}`
    );
    return false;
  }
  console.log(`✅ Updated user: ${userId}`);
  return true;
}

async function setAdminRole(email) {
  const sql = `UPDATE users SET role = 'admin' WHERE email = '${email}'`;
  const { exec } = await import("node:child_process");
  const repoRoot = "/Users/victor/Desktop/project/github/gomate";
  return new Promise((resolve, reject) => {
    exec(
      `pnpm exec wrangler d1 execute ${D1_NAME} --env staging --remote --command "${sql}"`,
      { cwd: `${repoRoot}/api` },
      (error, stdout, stderr) => {
        if (error) {
          console.warn(`⚠️ Failed to set admin role: ${stderr || error.message}`);
          reject(error);
        } else {
          console.log(`✅ Set admin role for ${email}`);
          resolve(stdout);
        }
      }
    );
  });
}

async function listCities() {
  const result = await apiRequest("GET", "/cities", null, true);
  if (!result.ok) {
    console.warn(`⚠️ Failed to list cities: ${result.status} ${JSON.stringify(result.data)}`);
    return [];
  }
  return result.data?.cities || [];
}

async function listLocations() {
  const result = await apiRequest("GET", "/locations", null, true);
  if (!result.ok) {
    console.warn(`⚠️ Failed to list locations: ${result.status} ${JSON.stringify(result.data)}`);
    return [];
  }
  return result.data?.locations || [];
}

async function listRoutes() {
  const result = await apiRequest("GET", "/routes", null, true);
  if (!result.ok) {
    console.warn(`⚠️ Failed to list routes: ${result.status} ${JSON.stringify(result.data)}`);
    return [];
  }
  return result.data?.routes || [];
}

async function createCity(city) {
  const result = await apiRequest("POST", "/cities", city, true);
  if (!result.ok) {
    console.warn(
      `⚠️ Failed to create city ${city.name}: ${result.status} ${JSON.stringify(result.data)}`
    );
    return null;
  }
  console.log(`✅ City OK: ${city.name} -> ${result.data.cityId}`);
  return result.data.cityId;
}

async function createLocation(location) {
  const result = await apiRequest("POST", "/locations", location, true);
  if (!result.ok) {
    console.warn(
      `⚠️ Failed to create location ${location.name}: ${result.status} ${JSON.stringify(result.data)}`
    );
    return null;
  }
  console.log(`✅ Location OK: ${location.name} -> ${result.data.location.id}`);
  return result.data.location.id;
}

async function createRoute(route) {
  const result = await apiRequest("POST", "/routes", route, true);
  if (!result.ok) {
    console.warn(
      `⚠️ Failed to create route ${route.name}: ${result.status} ${JSON.stringify(result.data)}`
    );
    return null;
  }
  console.log(`✅ Route OK: ${route.name} -> ${result.data.routeId}`);
  return result.data.routeId;
}

async function createTeam(team) {
  const result = await apiRequest("POST", "/teams", team, true);
  if (!result.ok) {
    console.warn(
      `⚠️ Failed to create team ${team.title}: ${result.status} ${JSON.stringify(result.data)}`
    );
    return null;
  }
  console.log(`✅ Team OK: ${team.title} -> ${result.data.team.id}`);
  return result.data.team.id;
}

async function main() {
  console.log(`\n🌱 Seeding GoMate staging environment: ${API_BASE}\n`);

  const health = await apiRequest("GET", "/health");
  if (!health.ok) {
    console.error("❌ Staging API health check failed");
    process.exit(1);
  }
  console.log(`✅ API health: ${health.data.status}\n`);

  // Create / auth users
  const users = [];
  for (const user of TEST_USERS) {
    const authData = await signUpOrLogin(user.email, user.password, user.name);
    const createdUser = authData?.user;
    if (createdUser) {
      users.push({ ...user, id: createdUser.id });
      await updateUser(createdUser.id, {
        nickname: user.nickname,
        bio: user.bio,
        level: user.level,
        wechat: user.wechat,
        completedHikes: user.completedHikes,
      });
    }
  }

  // Set admin role via D1 (API update endpoint doesn't allow role change)
  try {
    await setAdminRole(TEST_USERS[0].email);
  } catch (error) {
    console.warn("⚠️ Could not set admin role via D1, continuing anyway...");
  }

  // Re-login as admin for data creation
  await signUpOrLogin(TEST_USERS[0].email, TEST_USERS[0].password, TEST_USERS[0].name);

  // Create or fetch cities
  const cityNameToId = {};
  const existingCities = await listCities();
  for (const city of existingCities) {
    cityNameToId[city.name] = city.id;
  }
  for (const city of TEST_CITIES) {
    if (!cityNameToId[city.name]) {
      const cityId = await createCity(city);
      if (cityId) cityNameToId[city.name] = cityId;
    } else {
      console.log(`✅ City already exists: ${city.name} -> ${cityNameToId[city.name]}`);
    }
  }

  // Create locations
  const locationNameToId = {};
  const existingLocations = await listLocations();
  for (const loc of existingLocations) {
    locationNameToId[loc.name] = loc.id;
  }
  for (const location of TEST_LOCATIONS) {
    const cityId = cityNameToId[location.cityName];
    if (!cityId) {
      console.warn(`⚠️ City not found for location ${location.name}: ${location.cityName}`);
      continue;
    }
    const locationId = locationNameToId[location.name] || await createLocation({ ...location, cityId });
    if (locationId) locationNameToId[location.name] = locationId;
  }

  // Create routes
  const routeNameToId = {};
  const existingRoutes = await listRoutes();
  for (const r of existingRoutes) {
    routeNameToId[r.name] = r.id;
  }
  for (let i = 0; i < TEST_ROUTES.length; i++) {
    const route = TEST_ROUTES[i];
    const locationName = TEST_LOCATIONS[i].name;
    const locationId = locationNameToId[locationName];
    const cityId = cityNameToId[TEST_LOCATIONS[i].cityName];
    if (!locationId || !cityId) {
      console.warn(`⚠️ Missing ids for route ${route.name}`);
      continue;
    }
    const routeId = routeNameToId[route.name] || await createRoute({ ...route, locationId, cityId });
    if (routeId) routeNameToId[route.name] = routeId;
  }

  // Create teams as leader
  await signUpOrLogin(TEST_USERS[1].email, TEST_USERS[1].password, TEST_USERS[1].name);
  for (let i = 0; i < TEST_ROUTES.length; i++) {
    const route = TEST_ROUTES[i];
    const locationName = TEST_LOCATIONS[i].name;
    const locationId = locationNameToId[locationName];
    const routeId = routeNameToId[route.name];
    if (!locationId || !routeId) {
      console.warn(`⚠️ Missing ids for team ${route.name}`);
      continue;
    }
    const start = i === 0 ? startA : startB;
    await createTeam({
      locationId,
      routeId,
      title: i === 0 ? "周末清水湾海岸线徒步" : "梧桐山轻松线体验",
      description:
        i === 0
          ? "本周六一起去清水湾徒步，感受海风拂面的惬意，适合新手参加。"
          : "梧桐山入门路线，适合新手和家庭，路线平缓风景优美。",
      date: toDateStr(start),
      time: toTimeStr(start),
      durationMin: route.durationMax,
      maxMembers: i === 0 ? 6 : 8,
      requirements: i === 0 ? ["防晒霜", "防滑鞋", "充足的水"] : ["登山鞋", "水", "零食"],
    });
  }

  console.log("\n🎉 Staging seed complete!");
  console.log("\nTest accounts:");
  console.log("==============================================");
  console.log("Email                                  | Role     | Level      | Password");
  for (const user of TEST_USERS) {
    console.log(
      `${user.email.padEnd(38)} | ${user.role.padEnd(8)} | ${user.level.padEnd(10)} | ${PASSWORD}`
    );
  }
  console.log("==============================================");
  console.log(`\nStaging URLs:`);
  console.log(`  Frontend: https://staging.gomate.live`);
  console.log(`  API:      ${API_BASE}`);
}

main().catch((error) => {
  console.error("\n❌ Seed failed:", error);
  process.exit(1);
});
