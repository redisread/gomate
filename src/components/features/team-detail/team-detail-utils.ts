import type { TeamDisplayStatus } from "@/lib/team-display";

export function getStatusInfo(
  status: TeamDisplayStatus,
  t: (key: string) => string,
) {
  const map: Record<string, { label: string; color: string }> = {
    recruiting: {
      label: t("enums.teamStatus.recruiting"),
      color: "bg-brand-subtle text-accent-foreground",
    },
    full: {
      label: t("enums.teamStatus.full"),
      color: "bg-secondary text-muted-foreground",
    },
    closed: {
      label: t("enums.teamStatus.closed"),
      color: "bg-secondary text-muted-foreground",
    },
    formed: {
      label: t("enums.teamStatus.formed"),
      color: "bg-success-subtle text-accent-foreground",
    },
    ongoing: {
      label: t("enums.teamStatus.ongoing"),
      color: "bg-success-subtle text-accent-foreground",
    },
    completed: {
      label: t("enums.teamStatus.completed"),
      color: "bg-secondary text-muted-foreground",
    },
    cancelled: {
      label: t("enums.teamStatus.cancelled"),
      color: "bg-destructive/10 text-foreground",
    },
    expired_unformed: {
      label: t("enums.teamStatus.closed"),
      color: "bg-secondary text-muted-foreground",
    },
  };
  return map[status];
}
