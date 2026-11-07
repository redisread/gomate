export function d1Changes(result: D1Result<unknown> | undefined): number {
  return Number(result?.meta?.changes ?? 0);
}
