/** Collect leaf paths, treating arrays and null as leaves. */
export function collectKeys(obj, prefix = "") {
  const keys = [];
  for (const k of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
      keys.push(...collectKeys(obj[k], full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}
