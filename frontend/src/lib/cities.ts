import { fetchPublicAPI } from "./api";
import type { City } from "./types";

interface CitiesPage {
  success?: boolean;
  cities?: City[];
  pagination?: { hasMore?: boolean; totalPages?: number };
}

const MAX_CITY_PAGES = 20;

export async function fetchAllCities(options: { signal?: AbortSignal } = {}): Promise<City[]> {
  const cities: City[] = [];
  const seenIds = new Set<string>();
  let page = 1;

  while (page <= MAX_CITY_PAGES) {
    const response = await fetchPublicAPI(`/cities?level=city&page=${page}&pageSize=100`, { signal: options.signal });
    if (!response.ok) throw new Error("Failed to load cities");

    const data = (await response.json()) as CitiesPage;
    if (!data.success) throw new Error("Failed to load cities");
    if ((data.pagination?.totalPages ?? 0) > MAX_CITY_PAGES) throw new Error("City list exceeds the supported page limit");

    const pageCities = data.cities ?? [];
    const newCities = pageCities.filter((city) => !seenIds.has(city.id));
    newCities.forEach((city) => seenIds.add(city.id));
    cities.push(...newCities);
    if (!data.pagination?.hasMore || pageCities.length === 0) return cities;
    if (newCities.length === 0) throw new Error("City pagination repeated a page");
    page += 1;
  }

  throw new Error("City list exceeds the supported page limit");
}
