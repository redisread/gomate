import type { MyStatusInput } from '../../schemas.js';

interface ApiClient {
  baseUrl: string;
  apiKey: string;
}

// my_status requires session auth — real implementation in #232 (anti-hallucination)
export async function myStatus(
  _input: MyStatusInput,
  _client: ApiClient | null
) {
  return {
    userId: 'stub-user',
    name: '需要登录',
    cityId: null,
    cityName: null,
    memberSince: null,
    teamsCount: 0,
    storiesCount: 0,
    _stub: true,
    _note: 'my_status requires session auth — implement with #232 anti-hallucination gate',
  };
}
