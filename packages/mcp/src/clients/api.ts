// API client for gomate MCP — fetches @gomate/api with x-api-key auth
// Stub: returns mock data. Real implementation in #230/#231.

export interface ApiClientOptions {
  baseUrl: string;
  apiKey: string;
}

export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, apiKey } = options;

  async function request<T>(
    path: string,
    init?: RequestInit & { idempotencyKey?: string }
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };

    if (init?.idempotencyKey) {
      headers['Idempotency-Key'] = init.idempotencyKey;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...headers, ...init?.headers },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  return { request };
}
