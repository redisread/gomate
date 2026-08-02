/**
 * Compare local migration names with the migrations recorded by a remote D1.
 *
 * Legacy pre-Drizzle migrations are kept in the local journal as no-op
 * baseline files. They are allowed to be absent remotely because some
 * environments were created after the baseline was introduced.
 */
export function compareMigrationState({
  localNames,
  legacyNames,
  remoteNames,
}) {
  const local = new Set(localNames);
  const legacy = new Set(legacyNames);
  const remote = new Set(remoteNames);

  const missing = [...local]
    .filter((name) => !legacy.has(name) && !remote.has(name))
    .sort();
  const unexpected = [...remote].filter((name) => !local.has(name)).sort();

  return { missing, unexpected };
}
