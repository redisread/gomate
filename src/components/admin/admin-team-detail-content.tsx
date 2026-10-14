import type { Team } from "@/contracts";
import type { Locale } from "@/i18n";
import type { useI18n } from "@/hooks/useI18n";
import {
  RECRUITMENT_STATUS_KEYS,
  TEAM_LIFECYCLE_KEYS,
} from "@/lib/admin-team-filters";
import { AdminTeamActionbook } from "./admin-team-actionbook";

export function AdminTeamDetailContent({
  team,
  t,
  locale,
}: {
  team: Team;
  t: ReturnType<typeof useI18n>["t"];
  locale: Locale;
}) {
  const tagNames = team.tags?.map((tag) => tag.name).join(" · ");
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: team?.location?.region?.timezone ?? undefined,
        }).format(new Date(value))
      : t("admin.teamsManagement.notSet");

  return (
    <>
      <h3 className="text-lg font-semibold">{team.title}</h3>
      <p className="text-muted-foreground">
        {t("admin.teamsManagement.readOnly")}
      </p>
      <dl className="grid gap-4 sm:grid-cols-2">
        {[
          [t("admin.teamsManagement.teamId"), team.id],
          [
            t("admin.teamsManagement.activityType"),
            t(`enums.locationType.${team.activityType}`),
          ],
          [
            t("admin.teamsManagement.lifecycle"),
            t(TEAM_LIFECYCLE_KEYS[team.lifecycle]),
          ],
          [
            t("admin.teamsManagement.recruitmentStatus"),
            t(RECRUITMENT_STATUS_KEYS[team.recruitmentStatus]),
          ],
          [
            t("admin.teamsManagement.leader"),
            team.leader?.nickname || team.leader?.name || team.leaderId,
          ],
          [
            t("admin.teamsManagement.location"),
            team.location?.name || team.locationId,
          ],
          [
            t("admin.teamsManagement.participants"),
            `${team.activeParticipantCount} / ${team.maxParticipants}`,
          ],
          [t("admin.teamsManagement.startAt"), date(team.startAt)],
          [t("admin.teamsManagement.endAt"), date(team.endAt)],
          [t("admin.teamsManagement.formedAt"), date(team.formedAt)],
          [t("admin.teamsManagement.cancelledAt"), date(team.cancelledAt)],
          [t("admin.colCreatedAt"), date(team.createdAt)],
          [t("admin.colUpdatedAt"), date(team.updatedAt)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {team.description && (
        <section>
          <h3 className="mb-2 font-semibold">
            {t("admin.teamsManagement.descriptionLabel")}
          </h3>
          <p className="whitespace-pre-wrap">{team.description}</p>
        </section>
      )}
      {team.requirements.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">
            {t("admin.teamsManagement.requirements")}
          </h3>
          <ul className="list-inside list-disc">
            {team.requirements.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      {Boolean(team.tags?.length) && (
        <section>
          <h3 className="mb-2 font-semibold">{t("admin.formTags")}</h3>
          <p>{tagNames}</p>
        </section>
      )}
      <section className="border-t border-border pt-5">
        <h3 className="mb-3 font-semibold">
          {t("admin.teamsManagement.members")}
        </h3>
        <ul className="divide-y divide-border">
          <li className="space-y-1 py-3">
            <p>
              {team.leader?.nickname || team.leader?.name || team.leaderId} ·{" "}
              {t("admin.teamsManagement.leader")}
            </p>
            <p className="break-all text-xs text-muted-foreground">
              {team.leaderId}
            </p>
          </li>
          {team.participants?.map((member) => (
            <li key={member.userId} className="space-y-1 py-3">
              <p>
                {member.user?.nickname || member.user?.name || member.userId}
              </p>
              <p className="break-all text-xs text-muted-foreground">
                {member.userId}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("admin.teamsManagement.joinedAt")}: {date(member.joinedAt)}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <AdminTeamActionbook team={team} />
    </>
  );
}
