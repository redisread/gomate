import type { ListLocationsInput } from '../../schemas.js';

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

export async function listLocations(
  input: ListLocationsInput,
  client: ApiClient | null
) {
  if (!client) return { locations: [], nextCursor: null, total: 0, _stub: true };

  const params = new URLSearchParams();
  if (input.cityId) params.set('cityId', input.cityId);
  if (input.pageSize) params.set('pageSize', String(input.pageSize));
  if (input.cursor) params.set('page', input.cursor);

  const data = await apiRequest<{
    locations: Array<{
      id: string; name: string; cityId: string; address: string | null;
      latitude: number; longitude: number; difficulty: string;
      tags: string[]; coverImage: string | null;
    }>;
    pagination: { page: number; pageSize: number; total: number; totalPages: number; hasMore: boolean };
  }>(client, `/v1/locations?${params}`);

  return {
    locations: data.locations.map(l => ({
      id: l.id, name: l.name, cityId: l.cityId, address: l.address ?? '',
      latitude: l.latitude, longitude: l.longitude, difficulty: l.difficulty,
      tags: l.tags, coverImage: l.coverImage,
    })),
    nextCursor: data.pagination.hasMore ? String(data.pagination.page + 1) : null,
    total: data.pagination.total,
  };
}
