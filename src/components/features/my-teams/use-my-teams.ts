"use client";
import type { ApiResult } from "@/contracts/http-responses";
import type { TimelineTeamsResponse } from "@/contracts/public-responses";
import type { TeamResponse } from "@/contracts/team-api";

import * as React from "react";
import { fetchAPI, fetchCurrentUser, getApiErrorMessage } from "@/lib/api";
import { useI18n } from "@/hooks/useI18n";
import type { SessionUser } from "@/lib/types";
import type { TeamItem } from "./my-teams-types";

export function buildTimelinePath(
  path: string,
  cursor: string | null,
  limit = 10,
): string {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  return `${path}?${query}`;
}

export function mergeUniqueById<T extends { id: string }>(
  current: T[],
  incoming: T[],
): T[] {
  const seen = new Set(current.map((item) => item.id));
  const merged = [...current];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

export function useMyTeams() {
  const { t } = useI18n(["teams"]);
  const [currentUser, setCurrentUser] = React.useState<SessionUser | null>(
    null,
  );
  const [roleFilter, setRoleFilter] = React.useState<
    "all" | "leader" | "member"
  >("all");

  // Stable timeline cursors
  const [createdCursor, setCreatedCursor] = React.useState<string | null>(null);
  const [createdLoadingMore, setCreatedLoadingMore] = React.useState(false);
  const [joinedCursor, setJoinedCursor] = React.useState<string | null>(null);
  const [joinedLoadingMore, setJoinedLoadingMore] = React.useState(false);

  // Data
  const [createdTeams, setCreatedTeams] = React.useState<TeamItem[]>([]);
  const [createdLoading, setCreatedLoading] = React.useState(true);
  const [joinedTeams, setJoinedTeams] = React.useState<TeamItem[]>([]);
  const [joinedLoading, setJoinedLoading] = React.useState(true);

  // Modals / actions
  const [actionMessage, setActionMessage] = React.useState("");
  const [cancelTarget, setCancelTarget] = React.useState<string | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [formTarget, setFormTarget] = React.useState<string | null>(null);
  const [isForming, setIsForming] = React.useState(false);

  // Fetch current user
  React.useEffect(() => {
    fetchCurrentUser(`/login?redirect=/my-teams`)
      .then((user) => {
        if (user) setCurrentUser(user);
      })
      .catch(() => setActionMessage(t("teams.loadFailed")));
  }, [t]);

  // Data loaders
  const loadCreatedTeams = React.useCallback(
    async (cursor: string | null, append = false) => {
      if (!currentUser?.id) return;
      if (append) setCreatedLoadingMore(true);
      else setCreatedLoading(true);
      try {
        const r = await fetchAPI(
          buildTimelinePath("/users/me/created-teams", cursor),
        );
        const data = await r.json<ApiResult<TimelineTeamsResponse>>();
        if (!r.ok || !data.success) throw new Error("team list failed");
        if (data.success) {
          if (append)
            setCreatedTeams((prev) => mergeUniqueById(prev, data.teams || []));
          else setCreatedTeams(data.teams || []);
          setCreatedCursor(data.nextCursor ?? null);
        }
      } catch {
        setActionMessage(t("teams.loadFailed"));
      } finally {
        setCreatedLoading(false);
        setCreatedLoadingMore(false);
      }
    },
    [currentUser?.id, t],
  );

  const loadJoinedTeams = React.useCallback(
    async (cursor: string | null, append = false) => {
      if (!currentUser?.id) return;
      if (append) setJoinedLoadingMore(true);
      else setJoinedLoading(true);
      try {
        const r = await fetchAPI(
          buildTimelinePath("/users/me/joined-teams", cursor),
        );
        const data = await r.json<ApiResult<TimelineTeamsResponse>>();
        if (!r.ok || !data.success) throw new Error("team list failed");
        if (data.success) {
          if (append)
            setJoinedTeams((prev) => mergeUniqueById(prev, data.teams || []));
          else setJoinedTeams(data.teams || []);
          setJoinedCursor(data.nextCursor ?? null);
        }
      } catch {
        setActionMessage(t("teams.loadFailed"));
      } finally {
        setJoinedLoading(false);
        setJoinedLoadingMore(false);
      }
    },
    [currentUser?.id, t],
  );

  // Initial loads
  React.useEffect(() => {
    if (!currentUser?.id) return;
    void Promise.all([loadCreatedTeams(null), loadJoinedTeams(null)]);
  }, [currentUser?.id, loadCreatedTeams, loadJoinedTeams]);

  const loadMoreCreated = React.useCallback(() => {
    if (!createdCursor || createdLoadingMore) return;
    void loadCreatedTeams(createdCursor, true);
  }, [createdCursor, createdLoadingMore, loadCreatedTeams]);
  const loadMoreJoined = React.useCallback(() => {
    if (!joinedCursor || joinedLoadingMore) return;
    void loadJoinedTeams(joinedCursor, true);
  }, [joinedCursor, joinedLoadingMore, loadJoinedTeams]);
  const handleRoleFilterChange = (filter: "all" | "leader" | "member") => {
    setRoleFilter(filter);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "participated");
    if (filter === "all") params.delete("role");
    else params.set("role", filter);
    window.history.replaceState(null, "", `/my-teams?${params.toString()}`);
  };

  const handleCancelTeam = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      const r = await fetchAPI(`/teams/${cancelTarget}/cancel`, {
        method: "POST",
      });
      const data = await r.json<ApiResult<TeamResponse>>();
      if (data.success) {
        setCreatedTeams((prev) =>
          prev.map((team) => (team.id === cancelTarget ? data.team : team)),
        );
        setActionMessage(t("teams.cancelTeamSuccess"));
        setCancelTarget(null);
      } else {
        setActionMessage(getApiErrorMessage(data, t("teams.cancelTeamFailed")));
      }
    } catch {
      setActionMessage(t("teams.cancelTeamFailed"));
    } finally {
      setIsCancelling(false);
      setTimeout(() => setActionMessage(""), 3000);
    }
  };

  const handleFormTeam = async () => {
    if (!formTarget) return;
    const targetTeam = createdTeams.find((t) => t.id === formTarget);
    if (!targetTeam) return;
    setIsForming(true);
    try {
      const r = await fetchAPI(`/teams/${formTarget}/form`, { method: "POST" });
      const data = await r.json<ApiResult<TeamResponse>>();
      if (data.success) {
        setCreatedTeams((prev) =>
          prev.map((team) => (team.id === formTarget ? data.team : team)),
        );
        setActionMessage(t("teams.formTeamSuccess"));
        setFormTarget(null);
      } else {
        setActionMessage(getApiErrorMessage(data, t("teams.formTeamFailed")));
      }
    } catch {
      setActionMessage(t("teams.formTeamFailed"));
    } finally {
      setIsForming(false);
      setTimeout(() => setActionMessage(""), 3000);
    }
  };

  const activeCreated = createdTeams.filter((team) =>
    ["pending", "formed", "in_progress"].includes(team.lifecycle),
  );
  const archivedCreated = createdTeams.filter((team) =>
    ["completed", "cancelled", "expired_unformed"].includes(team.lifecycle),
  );
  const activeJoined = joinedTeams.filter((team) =>
    ["pending", "formed", "in_progress"].includes(team.lifecycle),
  );
  const archivedJoined = joinedTeams.filter((team) =>
    ["completed", "cancelled", "expired_unformed"].includes(team.lifecycle),
  );

  return {
    currentUser,
    roleFilter,
    createdHasMore: Boolean(createdCursor),
    createdLoadingMore,
    joinedHasMore: Boolean(joinedCursor),
    joinedLoadingMore,
    createdTeams,
    createdLoading,
    joinedTeams,
    joinedLoading,
    actionMessage,
    cancelTarget,
    isCancelling,
    formTarget,
    isForming,
    activeCreated,
    archivedCreated,
    activeJoined,
    archivedJoined,
    loadMoreCreated,
    loadMoreJoined,
    handleRoleFilterChange,
    handleCancelTeam,
    handleFormTeam,
    setActionMessage,
    setCancelTarget,
    setFormTarget,
  };
}
