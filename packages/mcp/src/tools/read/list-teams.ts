import type { ListTeamsInput } from '../../schemas.js';

export async function listTeams(_input: ListTeamsInput) {
  // Stub: return mock data. Real implementation in #230.
  return {
    teams: [
      {
        id: 'mock-team-1',
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
      },
    ],
    nextCursor: null,
    total: 1,
  };
}
