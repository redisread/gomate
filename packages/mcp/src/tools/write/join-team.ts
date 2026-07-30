import type { JoinTeamInput } from '../../schemas.js';

export async function joinTeam(input: JoinTeamInput) {
  return {
    teamId: input.teamId,
    userId: 'mock-user-1',
    status: 'pending',
    message: input.message ?? '',
    joinedAt: new Date().toISOString(),
  };
}
