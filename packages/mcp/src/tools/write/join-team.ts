import type { JoinTeamInput } from '../../schemas.js';

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

export async function joinTeam(
  input: JoinTeamInput,
  client: ApiClient | null
) {
  if (!client) return { teamId: input.teamId, status: 'pending', _stub: true };

  const body: Record<string, unknown> = {};
  if (input.message) body.message = input.message;

  const data = await apiRequest<{
    teamMember: { teamId: string; status: string };
  }>(client, `/v1/teams/${input.teamId}/join`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return { teamId: data.teamMember.teamId, status: data.teamMember.status };
}
