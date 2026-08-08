import { DIFFICULTY_CONFIG } from "./constants";

const MAX_FILTER_VALUES = 20;
const MAX_FILTER_VALUE_LENGTH = 64;
const DIFFICULTY_IDS = new Set(Object.keys(DIFFICULTY_CONFIG));

function parseValues(value: string | null, allowed?: Set<string>): string[] {
  if (!value) return [];
  return [...new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.length <= MAX_FILTER_VALUE_LENGTH && (!allowed || allowed.has(item))),
  )].slice(0, MAX_FILTER_VALUES);
}

export function parseTeamDifficultyFilters(value: string | null): string[] {
  return parseValues(value, DIFFICULTY_IDS);
}

export function parseTeamTagFilters(value: string | null): string[] {
  return parseValues(value);
}
