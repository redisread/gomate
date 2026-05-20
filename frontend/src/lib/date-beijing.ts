/**
 * Beijing Time (UTC+8) Date Utilities
 * For filtering teams by "today", "tomorrow", "weekend" in Beijing time
 */

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

export interface DateRange {
  start: string; // ISO date string (YYYY-MM-DD) for API query
  end: string;   // ISO date string (YYYY-MM-DD) for API query
  quickType: string | null; // 'today' | 'tomorrow' | 'weekend' | '7days' | '30days' | null
}

/** Convert UTC Date to Beijing Date */
export function toBeijingDate(utcDate: Date): Date {
  return new Date(utcDate.getTime() + BEIJING_OFFSET_MS);
}

/** Convert Beijing Date to UTC Date */
export function fromBeijingDate(beijingDate: Date): Date {
  return new Date(beijingDate.getTime() - BEIJING_OFFSET_MS);
}

/** Get current time in Beijing */
export function getBeijingNow(): Date {
  return toBeijingDate(new Date());
}

/** Format date to YYYY-MM-DD */
export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Get Beijing today's date range (for API query) */
export function getBeijingTodayRange(): { start: string; end: string } {
  const beijingNow = getBeijingNow();
  const dateStr = formatDateISO(fromBeijingDate(beijingNow));
  return { start: dateStr, end: dateStr };
}

/** Get Beijing tomorrow's date range (for API query) */
export function getBeijingTomorrowRange(): { start: string; end: string } {
  const beijingNow = getBeijingNow();
  const tomorrow = new Date(beijingNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = formatDateISO(fromBeijingDate(tomorrow));
  return { start: dateStr, end: dateStr };
}

/** Get Beijing this weekend's date range (Saturday-Sunday) */
export function getBeijingWeekendRange(): { start: string; end: string } {
  const beijingNow = getBeijingNow();
  const dayOfWeek = beijingNow.getUTCDay(); // 0=Sunday, 6=Saturday in UTC (same as Beijing)

  // Days until Saturday (if today is Sunday, go to next Saturday)
  const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;

  const saturday = new Date(beijingNow);
  saturday.setDate(beijingNow.getDate() + daysUntilSaturday);

  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  return {
    start: formatDateISO(fromBeijingDate(saturday)),
    end: formatDateISO(fromBeijingDate(sunday)),
  };
}

/** Get next N days range from today */
export function getBeijingNextNDaysRange(n: number): { start: string; end: string } {
  const beijingNow = getBeijingNow();
  const start = formatDateISO(fromBeijingDate(beijingNow));

  const endDate = new Date(beijingNow);
  endDate.setDate(endDate.getDate() + n);
  const end = formatDateISO(fromBeijingDate(endDate));

  return { start, end };
}

/** Check if a date is this weekend in Beijing time */
export function isBeijingWeekend(dateStr: string): boolean {
  const date = new Date(dateStr);
  const beijingDate = toBeijingDate(date);
  const dayOfWeek = beijingDate.getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/** Get quick select type based on current date range */
export function getActiveDateQuickType(
  startDate: string,
  endDate: string
): "today" | "tomorrow" | "weekend" | "7days" | "30days" | null {
  if (!startDate || !endDate) return null;

  const today = getBeijingTodayRange();
  if (startDate === today.start && endDate === today.end) return "today";

  const tomorrow = getBeijingTomorrowRange();
  if (startDate === tomorrow.start && endDate === tomorrow.end) return "tomorrow";

  const weekend = getBeijingWeekendRange();
  if (startDate === weekend.start && endDate === weekend.end) return "weekend";

  const next7Days = getBeijingNextNDaysRange(7);
  if (startDate === next7Days.start && endDate === next7Days.end) return "7days";

  const next30Days = getBeijingNextNDaysRange(30);
  if (startDate === next30Days.start && endDate === next30Days.end) return "30days";

  return null;
}

/** Get date range for a quick select type */
export function getDateRangeByQuickType(type: string): { start: string; end: string } | null {
  switch (type) {
    case "today":
      return getBeijingTodayRange();
    case "tomorrow":
      return getBeijingTomorrowRange();
    case "weekend":
      return getBeijingWeekendRange();
    case "7days":
      return getBeijingNextNDaysRange(7);
    case "30days":
      return getBeijingNextNDaysRange(30);
    default:
      return null;
  }
}

/** Get display summary for date filter */
export function getDateFilterSummary(
  startDate: string,
  endDate: string,
  t: (key: string, options?: { count?: number }) => string
): string {
  const quickType = getActiveDateQuickType(startDate, endDate);

  switch (quickType) {
    case "today":
      return t("filter.dateQuickToday");
    case "tomorrow":
      return t("filter.dateQuickTomorrow");
    case "weekend":
      return t("filter.dateQuickWeekend");
    case "7days":
      return t("filter.dateQuick7Days");
    case "30days":
      return t("filter.dateQuick30Days");
    default:
      return `${startDate} - ${endDate}`;
  }
}
