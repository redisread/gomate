import { copy } from "@/lib/copy";

export function formatDuration(minutes: number): string {
  const hours = minutes / 60;
  if (hours === Math.floor(hours)) {
    return `${hours} 小时`;
  }
  return `${hours.toFixed(1).replace(".0", "")} 小时`;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function getStatusInfo(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    recruiting: { label: copy.enums.teamStatus.recruiting, color: "bg-amber-50 text-amber-700" },
    full: { label: copy.enums.teamStatus.full, color: "bg-secondary text-muted-foreground" },
    formed: { label: copy.enums.teamStatus.formed, color: "bg-sky-50 text-sky-700" },
    completed: { label: copy.enums.teamStatus.completed, color: "bg-secondary text-muted-foreground" },
    cancelled: { label: copy.enums.teamStatus.cancelled, color: "bg-red-50 text-red-600" },
  };
  return map[status] || map.recruiting;
}
