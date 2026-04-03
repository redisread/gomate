import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';

const sqlite = Database('.wrangler/state/v3/d1/miniflare-D1DatabaseObject/gomate-db.sqlite');
const db = drizzle(sqlite, { schema });

async function updateTestUsers() {
  console.log('开始更新测试用户...');
  
  const updates = [
    {
      email: 'test_newbie@gomate.com',
      level: 'beginner',
      completedHikes: 0,
      bio: '热爱户外，刚刚开始徒步之旅',
      gender: 'male',
      birthday: new Date('2000-01-01'),
      wechat: 'hiker_newbie',
      nickname: '新手小明',
    },
    {
      email: 'hiker_intermediate@gomate.com',
      level: 'intermediate',
      completedHikes: 5,
      bio: '有一定徒步经验，喜欢探索新路线',
      gender: 'male',
      birthday: new Date('1996-02-01'),
      wechat: 'hiker_inter',
      nickname: '进阶小李',
    },
    {
      email: 'hiker_advanced@gomate.com',
      level: 'advanced',
      completedHikes: 15,
      bio: '资深徒步爱好者，多次完成长距离徒步',
      gender: 'male',
      birthday: new Date('1993-01-01'),
      wechat: 'hiker_adv',
      nickname: '高级小王',
    },
    {
      email: 'hiker_expert@gomate.com',
      level: 'expert',
      completedHikes: 30,
      bio: '户外专家，精通各种地形和技巧',
      gender: 'male',
      birthday: new Date('1987-01-01'),
      wechat: 'hiker_expert',
      nickname: '专家老张',
    },
    {
      email: 'team_leader@gomate.com',
      level: 'advanced',
      completedHikes: 12,
      bio: '喜欢组织团队活动，经验丰富的队长',
      gender: 'male',
      nickname: '队长小明',
      wechat: 'team_leader_xiaoming',
      extra: JSON.stringify({
        equipment: ['登山杖', '冲锋衣', '登山鞋', '背包'],
        experience: '组织过20+次团队徒步活动',
      }),
    },
    {
      email: 'female_hiker@gomate.com',
      level: 'intermediate',
      completedHikes: 8,
      bio: '热爱自然的女性徒步者，喜欢摄影',
      gender: 'female',
      birthday: new Date('1996-02-01'),
      nickname: '小红',
      wechat: 'female_hiker_red',
      extra: JSON.stringify({
        equipment: ['相机', '登山鞋', '防晒霜'],
        experience: '擅长风景摄影，记录徒步美景',
      }),
    },
    {
      email: 'young_hiker@gomate.com',
      level: 'beginner',
      completedHikes: 2,
      bio: '年轻活力的徒步新人',
      gender: 'male',
      birthday: new Date('2003-01-01'),
      nickname: '小年轻',
      wechat: 'young_hiker_2023',
      extra: JSON.stringify({
        equipment: ['运动鞋', '背包'],
        experience: '大学生，周末喜欢参加户外活动',
      }),
    },
  ];
  
  for (const update of updates) {
    try {
      await db.update(schema.users)
        .set({
          level: update.level,
          completedHikes: update.completedHikes,
          bio: update.bio,
          gender: update.gender,
          birthday: update.birthday,
          wechat: update.wechat,
          nickname: update.nickname,
          extra: update.extra,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.email, update.email));
      
      console.log(`✓ 已更新用户: ${update.email} (${update.nickname || update.level})`);
    } catch (error) {
      console.error(`✗ 更新失败: ${update.email}`, error);
    }
  }
  
  console.log('\n更新完成！查看所有测试用户：');
  
  const allUsers = await db.select({
    email: schema.users.email,
    nickname: schema.users.nickname,
    level: schema.users.level,
    completedHikes: schema.users.completedHikes,
    gender: schema.users.gender,
  })
    .from(schema.users)
    .where(eq(schema.users.email, 'test_newbie@gomate.com'));
  
  console.log(allUsers);
}

updateTestUsers().catch(console.error);