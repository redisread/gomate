import type { ListStoriesInput } from '../../schemas.js';

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

export async function listStories(
  input: ListStoriesInput,
  client: ApiClient | null
) {
  if (!client) return { stories: [], nextCursor: null, total: 0, _stub: true };

  const params = new URLSearchParams();
  if (input.teamId) params.set('teamId', input.teamId);
  if (input.pageSize) params.set('pageSize', String(input.pageSize));
  if (input.cursor) params.set('page', input.cursor);

  const data = await apiRequest<{
    stories: Array<{
      id: string; teamId: string; authorId: string; authorName: string;
      content: string; images: string[]; createdAt: string;
    }>;
    pagination: { page: number; pageSize: number; total: number; totalPages: number; hasMore: boolean };
  }>(client, `/v1/stories?${params}`);

  return {
    stories: data.stories.map(s => ({
      id: s.id, teamId: s.teamId, authorId: s.authorId, authorName: s.authorName,
      content: s.content, images: s.images, createdAt: s.createdAt,
    })),
    nextCursor: data.pagination.hasMore ? String(data.pagination.page + 1) : null,
    total: data.pagination.total,
  };
}
