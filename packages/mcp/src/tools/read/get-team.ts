import type { GetTeamInput } from '../../schemas.js';

interface ApiClient {
  baseUrl: string;
  apiKey: string;
}

async function apiRequest<T>(client: ApiClient, path: string): Promise<T> {
  const response = await fetch(`${client.baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', 'x-api-key': client.apiKey },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${response.statusText}${text ? ' — ' + text : ''}`);
  }
  return response.json() as Promise<T>;
}

export async function getTeam(input: GetTeamInput, client: ApiClient | null) {
  if (!client) return { id: input.teamId, name: 'mock-team', _stub: true };

  const data = await apiRequest<{
    team: {
      id: string; title: string; description: string | null; status: string;
      currentMembers: number; maxMembers: number; startTime: string;
      locationName: string | null;
    };
  }>(client, `/v1/teams/${input.teamId}`);

  return {
    id: data.team.id,
    name: data.team.title,
    description: data.team.description ?? '',
    status: data.team.status,
    currentMembers: data.team.currentMembers,
    maxMembers: data.team.maxMembers,
    scheduledDate: data.team.startTime,
    locationName: data.team.locationName,
  };
}
