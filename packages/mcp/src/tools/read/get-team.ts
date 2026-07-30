import type { GetTeamInput } from '../../schemas.js';

export async function getTeam(input: GetTeamInput) {
  return {
    id: input.teamId,
    name: '梧桐山徒步',
    description: '周末徒步',
    cityId: 'sz',
    locationId: 'mock-loc-1',
    status: 'approved',
    currentMembers: 3,
    maxMembers: 8,
    scheduledDate: '2026-08-03',
    tags: ['徒步', '周末'],
    createdAt: new Date().toISOString(),
  };
}
