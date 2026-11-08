import { useCallback } from "react";
import { useI18n } from "@/hooks/useI18n";
import { fetchPublicAPI } from "@/lib/api";
import type { TeamResponse } from "@/contracts/team-api";
import { SharePoster } from "../share-poster/share-poster";
import { createPosterContent } from "./team-poster-content";

export function TeamSharePoster({ teamId }: { teamId: string }) {
  const { t, locale } = useI18n(["teams", "enums", "common"]);
  const generate = useCallback(
    async (signal: AbortSignal) => {
      const response = await fetchPublicAPI(
        `/teams/${encodeURIComponent(teamId)}`,
        { signal, cache: "no-store" },
      );
      if (!response.ok) throw new Error("poster_team_unavailable");
      const data = await response.json<TeamResponse>();
      if (!data.success || !data.team)
        throw new Error("poster_team_unavailable");
      const content = createPosterContent(
        data.team,
        locale,
        window.location.origin,
        t,
      );
      const { renderTeamPoster } = await import("./render-team-poster");
      signal.throwIfAborted();
      const result = await renderTeamPoster(content, signal);
      return {
        ...result,
        title: content.title,
        accessibleText: [
          content.title,
          content.location,
          content.activity,
          content.status,
          content.capacity,
          content.date,
          content.weekday,
          content.startTime,
          content.endLabel,
          content.endTime,
          content.timeZone,
          content.note,
        ].join(" · "),
      };
    },
    [teamId, locale, t],
  );
  return (
    <SharePoster
      t={t}
      namespace="teams"
      generate={generate}
      filename={`gomate-team-${teamId}.png`}
    />
  );
}
