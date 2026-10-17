import { MapPin, NotebookPen, Users, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/hooks/useI18n";
import { useTeamDetail } from "./use-team-detail";
import { MemberAvatarGrid } from "./team-detail-members";

export function TeamMainContent({
  ctx,
}: {
  ctx: ReturnType<typeof useTeamDetail>;
}) {
  const { team, allMembers, isLeader, isMember, loadTeam } = ctx;
  const { t } = useI18n(["teams"]);
  if (!team) return null;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12">
      <div className="min-w-0 space-y-8 sm:space-y-10">
        {team.description && (
          <section aria-labelledby="team-story-title">
            <h2 id="team-story-title" className="text-section-h2">
              {t("teams.aboutTrip")}
            </h2>
            <div className="prose mt-4 max-w-none break-words text-base leading-8 text-muted-foreground prose-headings:text-foreground prose-a:text-accent-foreground prose-strong:text-foreground dark:prose-invert [&_pre]:max-w-full [&_table]:block [&_table]:overflow-x-auto [&_img]:rounded-lg">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h3>{children}</h3>,
                  h2: ({ children }) => <h3>{children}</h3>,
                }}
              >
                {team.description}
              </ReactMarkdown>
            </div>
          </section>
        )}
        {!isLeader && !isMember && team.meetingPoint && (
          <section
            className="rounded-xl bg-warm-subtle p-5 sm:p-6"
            aria-labelledby="team-meeting-title"
          >
            <h2
              id="team-meeting-title"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <MapPin
                className="h-5 w-5 text-accent-foreground"
                aria-hidden="true"
              />
              {t("teams.meetingPoint")}
            </h2>
            <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-muted-foreground">
              {team.meetingPoint}
            </p>
          </section>
        )}
        <RequirementsList requirements={team.requirements} />
      </div>
      {allMembers.length > 0 && (
        <section
          aria-labelledby="team-members-title"
          className="min-w-0 rounded-2xl bg-card p-5 shadow-warm-sm sm:p-6"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2
              id="team-members-title"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <Users
                className="h-5 w-5 text-accent-foreground"
                aria-hidden="true"
              />
              {t("teams.membersSectionTitle")}
            </h2>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs tabular-nums text-muted-foreground">
              {allMembers.length} {t("teams.goingCount")}
            </span>
          </div>
          <MemberAvatarGrid
            members={allMembers}
            teamId={team.id}
            canRemoveMembers={
              isLeader &&
              !team.cancelledAt &&
              Date.parse(team.startAt) > Date.now()
            }
            onRemoved={loadTeam}
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
    <section aria-labelledby="team-requirements-title">
      <h2
        id="team-requirements-title"
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <NotebookPen
          className="h-5 w-5 text-accent-foreground"
          aria-hidden="true"
        />
        {t("teams.requirementsTitle")}
      </h2>
      <ul className="mt-4 space-y-3">
        {requirements.map((requirement, index) => (
          <li
            key={`${index}-${requirement}`}
            className="flex items-start gap-3 text-sm leading-7 text-muted-foreground"
          >
            <Check
              className="mt-1 h-5 w-5 shrink-0 text-accent-foreground"
              aria-hidden="true"
            />
            <span className="min-w-0 break-words">{requirement}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
