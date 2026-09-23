import { AlertCircle, Users } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useTeamDetail } from "./use-team-detail";
import { MemberAvatarGrid } from "./team-detail-members";
import { TeamActionbookSection } from "./team-actionbook-section";

export function TeamMainContent({ ctx }: { ctx: ReturnType<typeof useTeamDetail> }) {
  const { team, allMembers, isLeader, isMember, userId, show, loadTeam } = ctx;
  const { t } = useI18n(["teams"]);

  if (!team) return null;

  return (
    <div className="space-y-7 lg:col-start-1 lg:row-start-1 lg:space-y-8">
      <TeamActionbookSection
        team={team}
        currentUserId={userId}
        isLeader={isLeader}
        isMember={isMember}
        members={allMembers}
        onToast={show}
        refetchTeam={loadTeam}
      />

      <RequirementsList requirements={team.requirements} />

      {allMembers.length > 0 && (
        <section
          aria-labelledby="team-members-title"
          className="rounded-[20px] bg-card px-5 py-6 shadow-[0_8px_28px_rgba(82,58,31,0.08)] sm:px-7 sm:py-7"
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 id="team-members-title" className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Users className="h-5 w-5 text-amber-600" aria-hidden="true" />
              {t("teams.guestList")}
            </h2>
            <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-sm tabular-nums text-muted-foreground">
              {allMembers.length} {t("teams.goingCount")}
            </span>
          </div>
          <MemberAvatarGrid
            members={allMembers}
            teamId={team.id}
            canMessageMembers={isLeader}
          />
        </section>
      )}
    </div>
  );
}

function RequirementsList({ requirements }: { requirements: string[] }) {
  const { t } = useI18n(["teams"]);
  if (!Array.isArray(requirements) || requirements.length === 0) return null;

  return (
    <section
      aria-labelledby="team-requirements-title"
      className="rounded-[20px] bg-secondary/70 px-5 py-6 sm:px-7 sm:py-7"
    >
      <h2 id="team-requirements-title" className="flex items-center gap-2 text-lg font-bold text-foreground">
        <AlertCircle className="h-5 w-5 text-amber-600" aria-hidden="true" />
        {t("teams.requirementsTitle")}
      </h2>
      <ol className="mt-5 grid gap-4 sm:grid-cols-2">
        {requirements.map((requirement, index) => (
          <li key={`${index}-${requirement}`} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold tabular-nums text-amber-800">
              {index + 1}
            </span>
            <span className="text-pretty">{requirement}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
