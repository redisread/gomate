import type { CreateTeamInput } from '../../schemas.js';

export async function createTeam(input: CreateTeamInput) {
  return {
    id: `mock-team-${Date.now()}`,
    name: input.name,
    description: input.description ?? '',
    locationId: input.locationId,
    cityId: 'sz',
    status: 'pending',
    currentMembers: 1,
    maxMembers: input.maxMembers ?? 8,
    scheduledDate: input.scheduledDate,
    tags: input.tags ?? [],
    createdAt: new Date().toISOString(),
  };
}
