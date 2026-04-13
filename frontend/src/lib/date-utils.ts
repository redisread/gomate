import { t, getLocale } from "@/i18n";

export function parseTimestamp(ts: string | number | null | undefined): Date | null {
  if (!ts) return null;
  return new Date(ts);
}

export function formatDate(
  ts: string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseTimestamp(ts);
  if (!date) return t("common.unknown");
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString(getLocale(), options ?? defaultOptions);
}

export function formatTimeAgo(ts: string | number | null | undefined): string {
  const date = parseTimestamp(ts);
  if (!date) return t("common.unknown");
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMinutes < 1) {
    return t("common.justNow");
  }
  if (diffMinutes < 60) {
    return t("common.minutesAgo", { vars: { count: diffMinutes } });
  }
  if (diffHours < 24) {
    return t("common.hoursAgo", { vars: { count: diffHours } });
  }
  return t("common.daysAgo", { vars: { count: diffDays } });
}

export function formatJoinDate(ts: string | number | null | undefined): string {
  const date = parseTimestamp(ts);
  if (!date) return t("common.unknown");
  return date.toLocaleDateString(getLocale(), {
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