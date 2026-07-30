import type { MyStatusInput } from '../../schemas.js';

export async function myStatus(_input: MyStatusInput) {
  return {
    userId: 'mock-user-1',
    name: '测试用户',
    cityId: 'sz',
    cityName: '深圳',
    memberSince: '2026-01-01',
    teamsCount: 2,
    storiesCount: 1,
  };
}
