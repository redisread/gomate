import type { CreateLocationInput } from '../../schemas.js';

export async function createLocation(input: CreateLocationInput) {
  return {
    id: `mock-loc-${Date.now()}`,
    name: input.name,
    cityId: input.cityId,
    address: input.address ?? '',
    latitude: input.latitude,
    longitude: input.longitude,
    difficulty: input.difficulty,
    tags: input.tags ?? [],
    coverImage: null,
    createdAt: new Date().toISOString(),
  };
}
