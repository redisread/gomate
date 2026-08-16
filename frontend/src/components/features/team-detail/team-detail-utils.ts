import type { TeamDisplayStatus } from "@/lib/team-display";

export function getStatusInfo(status: TeamDisplayStatus, t: (key: string) => string) {
  const map: Record<string, { label: string; color: string }> = {
    recruiting: { label: t("enums.teamStatus.recruiting"), color: "bg-amber-50 text-amber-700" },
    full: { label: t("enums.teamStatus.full"), color: "bg-secondary text-muted-foreground" },
    closed: { label: t("enums.teamStatus.closed"), color: "bg-secondary text-muted-foreground" },
    formed: { label: t("enums.teamStatus.formed"), color: "bg-sky-50 text-sky-700" },
    ongoing: { label: t("enums.teamStatus.ongoing"), color: "bg-sky-50 text-sky-700" },
    completed: { label: t("enums.teamStatus.completed"), color: "bg-secondary text-muted-foreground" },
    cancelled: { label: t("enums.teamStatus.cancelled"), color: "bg-red-50 text-red-600" },
    expired_unformed: { label: t("enums.teamStatus.closed"), color: "bg-secondary text-muted-foreground" },
  };
  return map[status];
}

export function formatDuration(hours: number, minutes?: number): string {
  if (minutes !== undefined) {
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(" ") || "0m";
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ") || "0m";
}

export function formatRelativeTime(timestamp: number | Date): string {
  const now = Date.now();
  const target = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const diff = target - now;
  const absDiff = Math.abs(diff);
  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return diff < 0 ? "just now" : "in a moment";
  if (minutes < 60) return diff < 0 ? `${minutes}m ago` : `in ${minutes}m`;
  if (hours < 24) return diff < 0 ? `${hours}h ago` : `in ${hours}h`;
  return diff < 0 ? `${days}d ago` : `in ${days}d`;
}
