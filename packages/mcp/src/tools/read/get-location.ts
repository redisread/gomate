import type { GetLocationInput } from '../../schemas.js';

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

export async function getLocation(input: GetLocationInput, client: ApiClient | null) {
  if (!client) return { id: input.locationId, name: 'mock-location', _stub: true };

  const data = await apiRequest<{
    location: {
      id: string; name: string; cityId: string; address: string | null;
      latitude: number; longitude: number; difficulty: string;
      tags: string[]; coverImage: string | null;
    };
  }>(client, `/v1/locations/${input.locationId}`);

  return {
    id: data.location.id,
    name: data.location.name,
    cityId: data.location.cityId,
    address: data.location.address ?? '',
    latitude: data.location.latitude,
    longitude: data.location.longitude,
    difficulty: data.location.difficulty,
    tags: data.location.tags,
    coverImage: data.location.coverImage,
  };
}
