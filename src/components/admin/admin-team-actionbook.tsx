import type { Team } from "@/contracts";
import { useI18n } from "@/hooks/useI18n";

export function AdminTeamActionbook({ team }: { team: Team }) {
  const { t } = useI18n(["teams"]);
  const book = team.checklist;
  if (!book) return null;
  const names = new Map(
    team.participants?.map((member) => [
      member.userId,
      member.user?.nickname || member.user?.name || member.userId,
    ]),
  );
  names.set(
    team.leaderId,
    team.leader?.nickname || team.leader?.name || team.leaderId,
  );
  const assignees = (ids: string[]) =>
    ids.map((id) => names.get(id) || id).join(" · ");
  return (
    <section className="space-y-4 border-t border-border pt-5">
      <h3 className="font-semibold">{t("teams.actionbook.title")}</h3>
      {book.meetingPoint && (
        <div className="space-y-1">
          <p className="font-medium">{book.meetingPoint.name}</p>
          {book.meetingPoint.time && (
            <p>
              {t("teams.actionbook.meeting.timeLabel", {
                time: book.meetingPoint.time,
              })}
            </p>
          )}
          {book.meetingPoint.note && (
            <p className="whitespace-pre-wrap">{book.meetingPoint.note}</p>
          )}
        </div>
      )}
      {book.transport && (
        <div>
          <p className="font-medium">
            {t(`teams.actionbook.transportMode.${book.transport.mode}`)}
          </p>
          <p className="whitespace-pre-wrap">{book.transport.detail}</p>
        </div>
      )}
      {book.gear && (
        <div className="space-y-1">
          <h4 className="font-medium">{t("teams.actionbook.gearTitle")}</h4>
          <p>
            {t("teams.actionbook.gear.essentialLabel")}{" "}
            {book.gear.essential.join(" · ")}
          </p>
          <p>
            {t("teams.actionbook.gear.optionalLabel")}{" "}
            {book.gear.optional.join(" · ")}
          </p>
          <p className="whitespace-pre-wrap">{book.gear.note}</p>
        </div>
      )}
      {Boolean(book.assignments?.length) && (
        <div>
          <h4 className="font-medium">
            {t("teams.actionbook.assignmentsTitle")}
          </h4>
          <ul className="mt-2 space-y-2">
            {book.assignments?.map((assignment) => (
              <li key={assignment.id}>
                <p>{assignment.task}</p>
                <p className="text-muted-foreground">
                  {assignees(assignment.assigneeIds)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {book.notes && <p className="whitespace-pre-wrap">{book.notes}</p>}
    </section>
  );
}
