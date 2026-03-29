import { copy } from "./copy";

export function parseTimestamp(ts: string | number | null | undefined): Date | null {
  if (!ts) return null;
  return new Date(ts);
}

export function formatDate(
  ts: string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseTimestamp(ts);
  if (!date) return copy.common.unknown;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("zh-CN", options ?? defaultOptions);
}

export function formatTimeAgo(ts: string | number | null | undefined): string {
  const date = parseTimestamp(ts);
  if (!date) return copy.common.unknown;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMinutes < 1) {
    return "刚刚";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}${copy.common.minutesAgo}`;
  }
  if (diffHours < 24) {
    return `${diffHours}${copy.common.hoursAgo}`;
  }
  return `${diffDays}${copy.common.daysAgo}`;
}

export function formatJoinDate(ts: string | number | null | undefined): string {
  const date = parseTimestamp(ts);
  if (!date) return copy.common.unknown;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
  });
}

export function getDaysUntil(ts: string | number | null | undefined): number | null {
  const date = parseTimestamp(ts);
  if (!date) return null;
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}