/** Recent IDs are oldest first. Only their rank is interpolated; IDs are bound. */
export function buildRandomLocationSql(recent: readonly string[]) {
  const priority = recent.length
    ? `CASE l.id ${recent.map((_, i) => `WHEN ? THEN ${i + 1}`).join(" ")} ELSE 0 END`
    : "0 + 0";
  // A single snapshot selects and counts all eligible places, including imageless ones.
  // Random ranks sample unseen places uniformly; if exhausted, oldest eligible wins.
  return `SELECT l.id, l.name, l.cover_image_url AS coverImageUrl, r.name AS city,
    count(*) OVER () AS total
    FROM locations l JOIN region r ON r.id = l.region_id
    WHERE l.status = 'published' AND r.level = 'city' AND r.service_enabled = 1
    ORDER BY ${priority}, random() LIMIT 1`;
}
