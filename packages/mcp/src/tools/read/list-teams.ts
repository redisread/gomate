import type { ListTeamsInput } from '../../schemas.js';

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

export async function listTeams(
  input: ListTeamsInput,
  client: ApiClient | null
) {
  if (!client) return { teams: [], nextCursor: null, total: 0, _stub: true };

  const params = new URLSearchParams();
  if (input.cityId) params.set('cityId', input.cityId);
  if (input.pageSize) params.set('pageSize', String(input.pageSize));
  if (input.cursor) params.set('page', input.cursor);

  const data = await apiRequest<{
    teams: Array<{
      id: string; title: string; description: string | null; status: string;
      currentMembers: number; maxMembers: number; startTime: string;
      locationName: string | null; locationCoverImage: string | null;
    }>;
    pagination: { page: number; pageSize: number; total: number; totalPages: number; hasMore: boolean };
  }>(client, `/v1/teams?${params}`);

  return {
    teams: data.teams.map(t => ({
      id: t.id, name: t.title, description: t.description ?? '',
      status: t.status, currentMembers: t.currentMembers, maxMembers: t.maxMembers,
      scheduledDate: t.startTime, locationName: t.locationName,
      locationCoverImage: t.locationCoverImage,
    })),
    nextCursor: data.pagination.hasMore ? String(data.pagination.page + 1) : null,
    total: data.pagination.total,
  };
}
