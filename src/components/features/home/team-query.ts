/** Shared by SSR and client refreshes; timestamps preserve the rolling window. */
export function homeTeamQuery(
  regionId?: string | null,
  now = Date.now(),
): string {
  const params = new URLSearchParams({
    recruitmentStatus: "open",
    lifecycle: "pending",
    limit: "4",
    startDateFrom: new Date(now).toISOString(),
    startDateTo: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (regionId) params.set("regionId", regionId);
  return `/teams?${params}`;
}
