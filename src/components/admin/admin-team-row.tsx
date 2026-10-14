import type * as React from "react";
import type { AdminTeamSummary } from "@/contracts";
import type { Locale } from "@/i18n";
import type { useI18n } from "@/hooks/useI18n";
import {
  RECRUITMENT_STATUS_KEYS,
  TEAM_LIFECYCLE_KEYS,
} from "@/lib/admin-team-filters";

interface Props {
  team: AdminTeamSummary;
  t: ReturnType<typeof useI18n>["t"];
  locale: Locale;
  disabled: boolean;
  onView: React.MouseEventHandler<HTMLButtonElement>;
}

export function AdminTeamRow({ team, t, locale, disabled, onView }: Props) {
  const button =
    "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
  return (
    <li
      key={team.id}
      className="grid min-w-0 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] sm:p-5"
    >
      <div className="min-w-0 space-y-3">
        <h2 className="break-words text-base font-semibold">{team.title}</h2>
        <p className="break-all text-xs text-muted-foreground">
          {t("admin.teamsManagement.teamId")}: {team.id}
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">
            {t(TEAM_LIFECYCLE_KEYS[team.lifecycle])}
          </span>
          <span className="rounded-md bg-muted px-2 py-1">
            {t(RECRUITMENT_STATUS_KEYS[team.recruitmentStatus])}
          </span>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              t("admin.teamsManagement.leader"),
              team.leader.nickname || team.leader.name,
            ],
            [t("admin.teamsManagement.location"), team.location.name],
            [
              t("admin.teamsManagement.participants"),
              `${team.activeParticipantCount} / ${team.maxParticipants}`,
            ],
            [
              t("admin.colCreatedAt"),
              new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(team.createdAt)),
            ],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-words tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <button
        type="button"
        className={`${button} self-start border border-border hover:bg-muted`}
        disabled={disabled}
        aria-label={t("admin.teamsManagement.viewDetailNamed", {
          title: team.title,
        })}
        aria-haspopup="dialog"
        onClick={onView}
      >
        {t("admin.teamsManagement.viewDetail")}
      </button>
    </li>
  );
}
