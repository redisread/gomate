import type { ListLocationsInput } from '../../schemas.js';

export async function listLocations(_input: ListLocationsInput) {
  return {
    locations: [
      {
        id: 'mock-loc-1',
        name: '梧桐山',
        cityId: 'sz',
        address: '深圳市盐田区',
        latitude: 22.5874,
        longitude: 114.1689,
        difficulty: 'moderate',
        tags: ['徒步', '自然'],
        coverImage: null,
        createdAt: new Date().toISOString(),
      },
    ],
    nextCursor: null,
    total: 1,
  };
}
