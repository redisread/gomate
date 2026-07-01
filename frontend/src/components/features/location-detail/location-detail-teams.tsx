"use client";

import { Users, ChevronRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { Team } from "@/lib/types";

interface LocationDetailTeamsProps {
  teams: Team[];
  locationSlug?: string;
}

export function LocationDetailTeams({ teams, locationSlug }: LocationDetailTeamsProps) {
  const { t } = useI18n(["locationDetail", "teams", "common"]);

  if (teams.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {t("locationDetail.browseTeams")}
        </h2>
        {locationSlug && (
          <a
            href={`/teams?location=${locationSlug}`}
            className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            {t("common.viewAll")}
            <ChevronRight className="w-4 h-4" />
          </a>
        )}
      </div>

      <div className="space-y-3">
        {teams.map((team) => (
          <a
            key={team.id}
            href={`/teams/${team.id}`}
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {team.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {team.members?.length ?? 0}/{team.maxMembers} {t("common.person")}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}
