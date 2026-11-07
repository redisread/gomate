export function cleanStrings(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}
