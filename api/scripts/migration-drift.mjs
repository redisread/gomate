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
  const localSequence = localNames.filter((name) => !legacy.has(name));
  const highestAppliedIndex = localSequence.reduce(
    (highest, name, index) => (remote.has(name) ? index : highest),
    -1,
  );
  const hasAppliedHistoryGap = localSequence
    .slice(0, highestAppliedIndex + 1)
    .some((name) => !remote.has(name));

  return { missing, unexpected, hasAppliedHistoryGap };
}

export function hasBlockingMigrationDrift(
  { missing, unexpected, hasAppliedHistoryGap = false },
  { allowPending },
) {
  return (
    unexpected.length > 0 ||
    hasAppliedHistoryGap ||
    (!allowPending && missing.length > 0)
  );
}

export function parseMigrationDriftArgs(args) {
  const supportedArgs = new Set(["--allow-pending", "--quiet"]);
  const unknownArg = args.find((arg) => !supportedArgs.has(arg));
  if (unknownArg) {
    throw new Error(`未知参数：${unknownArg}`);
  }

  return {
    allowPending: args.includes("--allow-pending"),
    quiet: args.includes("--quiet"),
  };
}
