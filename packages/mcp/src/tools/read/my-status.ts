import type { MyStatusInput } from '../../schemas.js';

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

export async function myStatus(input: MyStatusInput, client: ApiClient | null) {
  if (!client || !input.teamId) {
    return {
      status: 'none',
      _stub: true,
      _note: 'Requires API key + teamId',
    };
  }

  // Call GET /v1/teams/{teamId}/my-status
  const data = await apiRequest<{
    status: 'none' | 'pending' | 'approved' | 'rejected' | 'member';
    pollAfterSeconds?: number;
  }>(client, `/v1/teams/${input.teamId}/my-status`);

  return {
    status: data.status,
    ...(data.pollAfterSeconds && { pollAfterSeconds: data.pollAfterSeconds }),
  };
}
