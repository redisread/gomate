import type { PublishStoryInput } from '../../schemas.js';

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

export async function publishStory(
  input: PublishStoryInput,
  client: ApiClient | null
) {
  if (!client) return { id: `stub-${Date.now()}`, teamId: input.teamId, _stub: true };

  const body: Record<string, unknown> = {
    teamId: input.teamId,
    content: input.content,
  };
  if (input.images?.length) body.images = input.images;

  const data = await apiRequest<{
    story: { id: string; teamId: string };
  }>(client, '/v1/stories', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return { id: data.story.id, teamId: data.story.teamId };
}
