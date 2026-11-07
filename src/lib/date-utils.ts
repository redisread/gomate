import { t, getLocale } from "@/i18n";

function parseTimestamp(ts: string | number | null | undefined): Date | null {
  if (!ts) return null;
  return new Date(ts);
}

export function formatJoinDate(ts: string | number | null | undefined): string {
  const date = parseTimestamp(ts);
  if (!date) return t("common.unknown");
  return date.toLocaleDateString(getLocale(), {
    year: "numeric",
    month: "long",
  });
}