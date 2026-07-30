import type { CreateLocationInput } from '../../schemas.js';

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

export async function createLocation(
  input: CreateLocationInput,
  client: ApiClient | null
) {
  if (!client) return { id: `stub-${Date.now()}`, name: input.name, _stub: true };

  const body = {
    name: input.name,
    cityId: input.cityId,
    latitude: input.latitude,
    longitude: input.longitude,
    difficulty: input.difficulty,
    ...(input.address && { address: input.address }),
    ...(input.tags && { tags: input.tags }),
  };

  const data = await apiRequest<{
    location: { id: string; name: string };
  }>(client, '/v1/locations', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return { id: data.location.id, name: data.location.name };
}
