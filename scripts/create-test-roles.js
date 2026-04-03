#!/usr/bin/env node

/**
 * GoMate 移动端调试 - 快速创建测试角色
 * 
 * 使用：node scripts/create-test-roles.js
 */

const API_BASE = 'http://localhost:8799';

// 测试角色列表（覆盖所有等级）
const ROLES = [
  { email: 'test_beginner@gomate.dev', name: '徒步新手 - 小明', level: 'beginner', password: 'Test123456!' },
  { email: 'test_intermediate@gomate.dev', name: '进阶级 - 小华', level: 'intermediate', password: 'Test123456!' },
  { email: 'test_advanced@gomate.dev', name: '资深级 - 小强', level: 'advanced', password: 'Test123456!' },
  { email: 'test_expert@gomate.dev', name: '专家级 - 大神', level: 'expert', password: 'Test123456!' },
];

async function api(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok && res.status !== 422) {
    console.error(`❌ ${options.method || 'GET'} ${endpoint}:`, data);
  }
  return { ok: res.ok, status: res.status, data, headers: res.headers };
}

async function ensureUser(role) {
  console.log(`\n📝 检查用户：${role.email} (${role.name})`);
  
  // 尝试登录
  const loginRes = await api('/auth/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email: role.email, password: role.password }),
  });
  
  if (loginRes.ok && loginRes.data.token) {
    console.log(`✓ 用户已存在，直接登录`);
    const token = loginRes.headers.get('set-cookie')?.match(/better-auth\.session_token=([^;]+)/)?.[1] || loginRes.data.token;
    const userId = loginRes.data.user?.id;
    return { userId, token, exists: true };
  }
  
  // 注册新用户
  console.log(`  → 开始注册...`);
  const regRes = await api('/auth/sign-up/email', {
    method: 'POST',
    body: JSON.stringify({ email: role.email, password: role.password, name: role.name }),
  });
  
  if (!regRes.ok && regRes.status !== 422) {
    console.error(`  ❌ 注册失败：`, regRes.data);
    return null;
  }
  
  const token = regRes.headers.get('set-cookie')?.match(/better-auth\.session_token=([^;]+)/)?.[1] || regRes.data.token;
  const userId = regRes.data.user?.id;
  
  if (!userId || !token) {
    console.error(`  ❌ 未能获取用户信息`);
    return null;
  }
  
  console.log(`  ✓ 注册成功，ID: ${userId}`);
  
  // 更新用户资料（等级）
  await api('/user/update', {
    method: 'PATCH',
    headers: { Cookie: `better-auth.session_token=${token}` },
    body: JSON.stringify({ userId, level: role.level }),
  });
  
  console.log(`  ✓ 等级已更新：${role.level}`);
  return { userId, token, exists: false };
}

async function main() {
  console.log('🚀 GoMate 移动端测试角色创建工具\n');
  
  const users = [];
  
  // Step 1: 创建/登录测试用户
  for (const role of ROLES) {
    const result = await ensureUser(role);
    if (result) {
      users.push({ ...role, ...result });
    }
  }
  
  // Step 2: 打印登录信息
  console.log('\n' + '='.repeat(70));
  console.log('✅ 测试角色创建完成！\n');
  
  console.log('📋 角色列表（用于移动端调试）：\n');
  users.forEach((u, i) => {
    const levelNames = { beginner: '入门级', intermediate: '进阶级', advanced: '资深级', expert: '专家级' };
    console.log(`${i + 1}. ${u.name} (${u.email})`);
    console.log(`   等级：${levelNames[u.level]} | 密码：${u.password}`);
    console.log(`   用途：测试${u.level === 'beginner' ? '新手入门' : u.level === 'intermediate' ? '中等难度路线' : u.level === 'advanced' ? '高难度挑战' : '专家级活动'}功能\n`);
  });
  
  console.log('💡 使用方式：');
  console.log('   1. 在安卓移动端使用上述账号密码登录');
  console.log('   2. 不同等级用户体验不同的功能权限');
  console.log('   3. 可以创建队伍、加入队伍、收藏地点等');
  console.log('   4. 所有账号密码相同，方便切换测试\n');
  
  return users;
}

main().catch(console.error);
