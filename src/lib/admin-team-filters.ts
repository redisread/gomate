import type {
  AdminTeamFilters,
  RecruitmentStatus,
  TeamLifecycle,
} from "@/contracts";
import type { TranslationKey } from "@/i18n/types";

export const TEAM_LIFECYCLE_KEYS = {
  pending: "enums.teamLifecycle.pending",
  formed: "enums.teamLifecycle.formed",
  in_progress: "enums.teamLifecycle.in_progress",
  completed: "enums.teamLifecycle.completed",
  cancelled: "enums.teamLifecycle.cancelled",
  expired_unformed: "admin.teamsManagement.expiredUnformed",
} satisfies Record<TeamLifecycle, TranslationKey>;

export const RECRUITMENT_STATUS_KEYS = {
  open: "admin.teamsManagement.recruitmentOpen",
  closed: "admin.teamsManagement.recruitmentClosed",
} satisfies Record<RecruitmentStatus, TranslationKey>;

export function readAdminTeamFilters(
  params: URLSearchParams,
): AdminTeamFilters {
  const q = params.get("q")?.trim().slice(0, 100);
  const lifecycle = params.get("lifecycle");
  const recruitmentStatus = params.get("recruitmentStatus");
  return {
    ...(q ? { q } : {}),
    ...(lifecycle && Object.hasOwn(TEAM_LIFECYCLE_KEYS, lifecycle)
      ? { lifecycle: lifecycle as TeamLifecycle }
      : {}),
    ...(recruitmentStatus &&
    Object.hasOwn(RECRUITMENT_STATUS_KEYS, recruitmentStatus)
      ? { recruitmentStatus: recruitmentStatus as RecruitmentStatus }
      : {}),
  };
}

export function adminTeamFilterParams(
  filters: AdminTeamFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.lifecycle) params.set("lifecycle", filters.lifecycle);
  if (filters.recruitmentStatus)
    params.set("recruitmentStatus", filters.recruitmentStatus);
  return params;
}
