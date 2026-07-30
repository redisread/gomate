import type { CreateTeamInput } from '../../schemas.js';

interface ApiClient {
  baseUrl: string;
  apiKey: string;
}

async function apiRequest<T>(client: ApiClient, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${client.baseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-api-key': client.apiKey, ...init?.headers },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${response.statusText}${text ? ' — ' + text : ''}`);
  }
  return response.json() as Promise<T>;
}

export async function createTeam(
  input: CreateTeamInput,
  client: ApiClient | null
) {
  if (!client) return { id: `stub-${Date.now()}`, name: input.name, status: 'pending', _stub: true };

  const body: Record<string, unknown> = {
    name: input.name,
    locationId: input.locationId,
    scheduledDate: input.scheduledDate,
  };
  if (input.description) body.description = input.description;
  if (input.maxMembers) body.maxMembers = input.maxMembers;
  if (input.tags) body.tags = input.tags;

  const data = await apiRequest<{
    team: { id: string; title: string; status: string };
  }>(client, '/v1/teams', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return { id: data.team.id, name: data.team.title, status: data.team.status };
}
