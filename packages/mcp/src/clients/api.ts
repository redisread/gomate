// API client for gomate MCP — fetches @gomate/api with x-api-key auth
// Real implementation: #230 read tools + #231 write tools.

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
      const text = await response.text().catch(() => '');
      throw new Error(`API error ${response.status}: ${response.statusText}${text ? ' — ' + text : ''}`);
    }

    return response.json() as Promise<T>;
  }

  return { request };
}

// Default client from env (used in Worker context)
export function createClientFromEnv(env: { API_BASE_URL?: string; API_KEY?: string }) {
  const baseUrl = env.API_BASE_URL;
  const apiKey = env.API_KEY;
  if (!baseUrl || !apiKey) return null;
  return createApiClient({ baseUrl, apiKey });
}
