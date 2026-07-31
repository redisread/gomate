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

export async function discoverEnums(
  input: { enumType: 'city' | 'difficulty' | 'team_status' | 'tag' },
  client: ApiClient | null
) {
  if (!client) {
    return { enumType: input.enumType, values: [], _stub: true };
  }

  switch (input.enumType) {
    case 'city': {
      const data = await apiRequest<{ cities: Array<{ id: string; name: string }> }>(client, '/v1/enums?type=city');
      return { enumType: 'city', values: data.cities.map(c => ({ id: c.id, name: c.name })) };
    }
    case 'difficulty': {
      return { enumType: 'difficulty', values: ['easy', 'moderate', 'hard'] };
    }
    case 'team_status': {
      return { enumType: 'team_status', values: ['approved', 'pending', 'cancelled'] };
    }
    case 'tag': {
      const data = await apiRequest<{ tags: Array<{ id: string; name: string }> }>(client, '/v1/enums?type=tag');
      return { enumType: 'tag', values: data.tags.map(t => ({ id: t.id, name: t.name })) };
    }
    default:
      return { enumType: input.enumType as string, values: [], error: 'Unknown enum type' };
  }
}
