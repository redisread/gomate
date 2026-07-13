/**
 * Date/time formatting utilities with Beijing timezone (UTC+8) support.
 *
 * NOTE: This project primarily serves users in China, so Beijing time
 * is the default display timezone. All hard-coded UTC+8 offsets should
 * be consolidated here to avoid duplication.
 */

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Format a Date as Beijing date and time strings */
export function formatBeijingDateTime(date: Date | null): { date: string | null; time: string | null } {
  if (!date) return { date: null, time: null };
  const beijingDate = new Date(date.getTime() + BEIJING_OFFSET_MS);
  return {
    date: beijingDate.toISOString().split("T")[0],
    time: beijingDate.toISOString().slice(11, 16),
  };
}

/** Format a Date as Beijing date string (YYYY-MM-DD) */
export function formatBeijingDate(date: Date | null): string | null {
  if (!date) return null;
  const beijingDate = new Date(date.getTime() + BEIJING_OFFSET_MS);
  return beijingDate.toISOString().split("T")[0];
}

/** Format a Date as Beijing time string (HH:mm) */
export function formatBeijingTime(date: Date | null): string | null {
  if (!date) return null;
  const beijingDate = new Date(date.getTime() + BEIJING_OFFSET_MS);
  return beijingDate.toISOString().slice(11, 16);
}
