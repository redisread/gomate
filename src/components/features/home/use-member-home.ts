"use client";

import * as React from "react";
import { fetchAPI } from "@/lib/api";
import type { Team } from "@/lib/types";
import { mergeMemberTeams } from "./member-home-utils";

interface MemberTeamsResponse {
  success?: boolean;
  teams?: Team[];
}

export function useMemberHome(userId: string) {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [requestVersion, setRequestVersion] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    async function loadMemberTeams() {
      setLoading(true);
      setError(null);

      try {
        const [createdResponse, joinedResponse] = await Promise.all([
          fetchAPI("/users/me/created-teams?limit=20"),
          fetchAPI("/users/me/joined-teams?limit=20"),
        ]);

        if (!createdResponse.ok || !joinedResponse.ok) throw new Error("member teams request failed");

        const [createdData, joinedData] = await Promise.all([
          createdResponse.json() as Promise<MemberTeamsResponse>,
          joinedResponse.json() as Promise<MemberTeamsResponse>,
        ]);

        if (!cancelled) setTeams(mergeMemberTeams(createdData.teams ?? [], joinedData.teams ?? []));
      } catch {
        if (!cancelled) {
          setTeams([]);
          setError("load-failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (userId) loadMemberTeams();
    return () => { cancelled = true; };
  }, [userId, requestVersion]);

  const retry = React.useCallback(() => setRequestVersion((version) => version + 1), []);

  return { teams, loading, error, retry };
}
