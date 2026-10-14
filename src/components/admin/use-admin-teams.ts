import * as React from "react";
import type {
  AdminTeamFilters,
  AdminTeamSummary,
  AdminTeamsResponse,
} from "@/contracts";
import type { TranslationKey } from "@/i18n/types";
import { fetchAPI } from "@/lib/api";
import { adminCatchMessage, adminJsonOrThrow } from "@/lib/admin-i18n";
import {
  adminTeamFilterParams,
  readAdminTeamFilters,
} from "@/lib/admin-team-filters";

export function useAdminTeams(
  initialFilters: AdminTeamFilters,
  t: (key: TranslationKey) => string,
) {
  const [filters, setFilters] = React.useState(initialFilters);
  const [teams, setTeams] = React.useState<AdminTeamSummary[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState("");
  const requestId = React.useRef(0);
  const controller = React.useRef<AbortController | null>(null);
  const failedCursor = React.useRef<string | undefined>(undefined);

  const invalidate = React.useCallback(() => {
    requestId.current += 1;
    controller.current?.abort();
  }, []);

  const load = React.useCallback(
    async (activeFilters: AdminTeamFilters, cursor?: string) => {
      invalidate();
      const id = requestId.current;
      const abort = new AbortController();
      controller.current = abort;
      setLoading(!cursor);
      setLoadingMore(Boolean(cursor));
      setError("");
      failedCursor.current = cursor;
      try {
        const params = adminTeamFilterParams(activeFilters);
        params.set("limit", "20");
        if (cursor) params.set("cursor", cursor);
        const response = await fetchAPI(`/admin/teams?${params}`, {
          signal: abort.signal,
        });
        const body = await adminJsonOrThrow<AdminTeamsResponse>(
          response,
          t,
          "admin.management.loadFailed",
        );
        if (id !== requestId.current) return;
        setTeams((current) =>
          cursor
            ? [
                ...current,
                ...body.teams.filter(
                  (team) => !current.some((item) => item.id === team.id),
                ),
              ]
            : body.teams,
        );
        setNextCursor(body.nextCursor);
      } catch (cause) {
        if (id === requestId.current)
          setError(adminCatchMessage(cause, t, "admin.management.loadFailed"));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [invalidate, t],
  );

  React.useEffect(() => {
    void load(filters);
    return invalidate;
  }, [filters, load, invalidate]);

  React.useEffect(() => {
    const restore = () => {
      invalidate();
      setFilters(
        readAdminTeamFilters(new URLSearchParams(window.location.search)),
      );
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [invalidate]);

  const applyFilters = (next: AdminTeamFilters) => {
    invalidate();
    setLoading(true);
    setLoadingMore(false);
    setError("");
    setNextCursor(null);
    setFilters(next);
    const url = new URL(window.location.href);
    for (const key of ["q", "lifecycle", "recruitmentStatus", "cursor"])
      url.searchParams.delete(key);
    adminTeamFilterParams(next).forEach((value, key) =>
      url.searchParams.set(key, value),
    );
    window.history.replaceState(window.history.state, "", url);
  };

  return {
    filters,
    teams,
    nextCursor,
    loading,
    loadingMore,
    error,
    applyFilters,
    loadMore: () => {
      if (nextCursor && !loading && !loadingMore && !error)
        void load(filters, nextCursor);
    },
    retry: () => {
      void load(filters, failedCursor.current);
    },
  };
}
