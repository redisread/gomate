import * as React from "react";
import type {
  AdminTeamFilters,
  RecruitmentStatus,
  TeamLifecycle,
} from "@/contracts";
import { useI18n } from "@/hooks/useI18n";
import {
  RECRUITMENT_STATUS_KEYS,
  TEAM_LIFECYCLE_KEYS,
} from "@/lib/admin-team-filters";
import { AdminTeamDetail } from "./admin-team-detail";
import { AdminTeamRow } from "./admin-team-row";
import { useAdminTeams } from "./use-admin-teams";

const control =
  "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function AdminTeamsManager({
  initialFilters = {},
}: {
  initialFilters?: AdminTeamFilters;
}) {
  const { t, locale } = useI18n(["admin", "enums"]);
  const list = useAdminTeams(initialFilters, t);
  const [query, setQuery] = React.useState(initialFilters.q ?? "");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const returnFocus = React.useRef<HTMLButtonElement | null>(null);
  const searchId = React.useId();
  const lifecycleId = React.useId();
  const recruitmentId = React.useId();
  React.useEffect(() => setQuery(list.filters.q ?? ""), [list.filters.q]);
  const closeDetail = React.useCallback(() => setSelectedId(null), []);

  return (
    <div className="space-y-5">
      <form
        className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          list.applyFilters({ ...list.filters, q: query.trim() || undefined });
        }}
      >
        <div className="min-w-0 sm:col-span-2 xl:col-span-1">
          <label htmlFor={searchId} className="mb-2 block text-sm font-medium">
            {t("admin.teamsManagement.search")}
          </label>
          <input
            id={searchId}
            type="search"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("admin.teamsManagement.searchPlaceholder")}
            className={control}
          />
        </div>
        <div className="min-w-0">
          <label
            htmlFor={lifecycleId}
            className="mb-2 block text-sm font-medium"
          >
            {t("admin.teamsManagement.lifecycle")}
          </label>
          <select
            id={lifecycleId}
            value={list.filters.lifecycle ?? ""}
            className={control}
            onChange={(event) =>
              list.applyFilters({
                ...list.filters,
                lifecycle: (event.target.value as TeamLifecycle) || undefined,
              })
            }
          >
            <option value="">{t("admin.teamsManagement.allLifecycles")}</option>
            {Object.entries(TEAM_LIFECYCLE_KEYS).map(([value, key]) => (
              <option key={value} value={value}>
                {t(key)}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label
            htmlFor={recruitmentId}
            className="mb-2 block text-sm font-medium"
          >
            {t("admin.teamsManagement.recruitmentStatus")}
          </label>
          <select
            id={recruitmentId}
            value={list.filters.recruitmentStatus ?? ""}
            className={control}
            onChange={(event) =>
              list.applyFilters({
                ...list.filters,
                recruitmentStatus:
                  (event.target.value as RecruitmentStatus) || undefined,
              })
            }
          >
            <option value="">
              {t("admin.teamsManagement.allRecruitmentStatuses")}
            </option>
            {Object.entries(RECRUITMENT_STATUS_KEYS).map(([value, key]) => (
              <option key={value} value={value}>
                {t(key)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className={`${button} self-end bg-primary text-primary-foreground hover:bg-primary/90`}
        >
          {t("admin.management.search")}
        </button>
      </form>
      <p className="text-sm text-muted-foreground">
        {t("admin.teamsManagement.readOnly")}
      </p>
      <div
        role="status"
        className="min-h-6 text-sm text-muted-foreground"
        aria-live="polite"
      >
        {list.loading || list.loadingMore
          ? t("admin.management.loading")
          : t("admin.teamsManagement.loadedCount", {
              count: list.teams.length,
            })}
      </div>
      {list.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 p-3"
        >
          <p className="text-sm text-destructive">{list.error}</p>
          <button
            type="button"
            onClick={list.retry}
            className={`${button} bg-muted`}
          >
            {t("admin.teamsManagement.retry")}
          </button>
        </div>
      )}
      <ul
        aria-label={t("admin.teamsManagement.listLabel")}
        aria-busy={list.loading || list.loadingMore}
        className="divide-y divide-border rounded-xl border border-border bg-card"
      >
        {list.teams.map((team) => (
          <AdminTeamRow
            key={team.id}
            team={team}
            t={t}
            locale={locale}
            disabled={list.loading}
            onView={(event) => {
              returnFocus.current = event.currentTarget;
              setSelectedId(team.id);
            }}
          />
        ))}
      </ul>
      {!list.loading && !list.error && list.teams.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          {t("admin.teamsManagement.noTeams")}
        </p>
      )}
      {list.nextCursor && (
        <button
          type="button"
          onClick={list.loadMore}
          disabled={list.loading || list.loadingMore || Boolean(list.error)}
          className={`${button} border border-border hover:bg-muted`}
        >
          {t("admin.management.loadMore")}
        </button>
      )}
      <AdminTeamDetail
        teamId={selectedId}
        onClose={closeDetail}
        returnFocusRef={returnFocus}
      />
    </div>
  );
}
