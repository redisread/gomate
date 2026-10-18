import { Alert as SwAlert } from "@/components/starwind-react/alert";
import { Button as SwButton } from "@/components/starwind-react/button";
import * as React from "react";
import { Users, ArrowUpRight, RefreshCw } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI } from "@/lib/api";
import type { TeamListResponse } from "@/contracts/team-api";
import { TeamCard } from "./team-card";

type TeamState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: TeamListResponse };

export function TeamListSection({ locationId }: { locationId: string }) {
  const { t } = useI18n(["locations", "locationDetail", "common"]);
  const [state, setState] = React.useState<TeamState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(15_000),
    ]);
    setState({ status: "loading" });
    void (async () => {
      try {
        const res = await fetchAPI(
          `/teams?locationId=${encodeURIComponent(locationId)}&recruitmentStatus=open&limit=3`,
          { signal },
        );
        if (!res.ok) throw new Error("teams_unavailable");
        const data: TeamListResponse = await res.json();
        if (!data.success || !Array.isArray(data.teams))
          throw new Error("teams_unavailable");
        if (!signal.aborted) setState({ status: "ready", data });
      } catch {
        if (!controller.signal.aborted) setState({ status: "error" });
      }
    })();
    return () => controller.abort();
  }, [locationId, attempt]);

  return (
    <section
      id="location-teams"
      aria-labelledby="location-teams-title"
      className="scroll-mt-24 min-w-0 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground">
            {t("locationDetail.together")}
          </p>
          <h2
            id="location-teams-title"
            className="text-section-h2 text-foreground"
          >
            {t("locations.detailWaiting")}
          </h2>
        </div>
        <SwButton as="a" variant="plain" size="inherit"
          href={`/teams?locationId=${locationId}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-accent-foreground hover:underline underline-offset-4"
        >
          {t("locationDetail.browseTeams")}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </SwButton>
      </div>
      {state.status === "loading" ? (
        <div
          role="status"
          className="flex min-h-40 items-center justify-center rounded-2xl bg-muted/50 text-sm text-muted-foreground"
        >
          {t("common.loading")}
        </div>
      ) : state.status === "error" ? (
        <div className="rounded-2xl bg-muted/50 p-6">
          <SwAlert as="p" variant="plain" role="alert" className="text-sm text-foreground">
            {t("locationDetail.teamsLoadFailed")}
          </SwAlert>
          <SwButton variant="plain" size="inherit"
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold text-foreground shadow-card transition-colors hover:bg-secondary"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            {t("common.retry")}
          </SwButton>
        </div>
      ) : state.data.teams.length === 0 ? (
        <div className="flex items-start gap-4 rounded-2xl bg-warm-subtle p-6 sm:p-8">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card text-accent-foreground">
            <Users aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="mb-2 font-semibold text-foreground">
              {t("locationDetail.emptyTeamsTitle")}
            </h3>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              {t("locations.detailNoTeamsDesc")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {state.data.teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </section>
  );
}
