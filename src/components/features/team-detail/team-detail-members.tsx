import { Alert as SwAlert } from "@/components/starwind-react/alert";
import { Button as SwButton } from "@/components/starwind-react/button";
import * as React from "react";
import { ChevronDown, Loader2, UserMinus } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/lib/types";
import { fetchAPI, getApiErrorMessage } from "@/lib/api";

export function MemberAvatarGrid({
  members,
  teamId,
  canRemoveMembers = false,
  onRemoved,
}: {
  members: TeamMember[];
  teamId?: string;
  canRemoveMembers?: boolean;
  onRemoved?: () => Promise<void>;
}) {
  const { t } = useI18n(["teams"]);
  const [expanded, setExpanded] = React.useState(false);
  const [removingUserId, setRemovingUserId] = React.useState<string | null>(
    null,
  );
  const [messageError, setMessageError] = React.useState<string | null>(null);
  const gridId = React.useId();
  const GRID_THRESHOLD = 8;
  const visible = expanded ? members : members.slice(0, GRID_THRESHOLD);
  const hidden = members.length - GRID_THRESHOLD;

  const handleRemoveMember = async (member: TeamMember) => {
    if (!teamId) return;
    setRemovingUserId(member.userId);
    setMessageError(null);
    try {
      const response = await fetchAPI(
        `/teams/${teamId}/members/${member.userId}/remove`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          getApiErrorMessage(data, t("teams.removeMemberFailed")),
        );
      await onRemoved?.();
    } catch (err) {
      setMessageError(
        err instanceof Error ? err.message : t("teams.removeMemberFailed"),
      );
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <div>
      <div
        id={gridId}
        className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-3"
      >
        {visible.map((m, index) => {
          const user = m.user;
          if (!user) return null;
          const name = user.nickname || user.name;
          const canRemoveMember =
            canRemoveMembers && !!teamId && m.leftAt === null;

          return (
            <div
              key={m.userId}
              className={cn(
                "relative min-w-0 flex flex-col items-center gap-2",
                expanded &&
                  index >= GRID_THRESHOLD &&
                  "motion-safe:animate-fade-in",
              )}
            >
              <a
                href={`/users/${m.userId}`}
                aria-label={name}
                className="relative flex min-h-11 w-full min-w-0 flex-col items-center gap-2 rounded-lg p-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0",
                    "bg-warm-subtle ring-1 ring-black/10 dark:ring-white/10",
                  )}
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-semibold text-sm text-accent-foreground">
                      {name?.[0] || "?"}
                    </span>
                  )}
                </div>
                <span className="w-full break-words text-center text-sm font-medium leading-5">
                  {name}
                </span>
                {user.extra.wechat && (
                  <p
                    title={user.extra.wechat}
                    className="text-xs text-muted-foreground min-w-0 w-full break-all text-center leading-5"
                  >
                    {user.extra.wechat}
                  </p>
                )}
              </a>
              {canRemoveMember && (
                <SwButton variant="plain" size="inherit"
                  type="button"
                  onClick={() => handleRemoveMember(m)}
                  disabled={removingUserId === m.userId}
                  aria-label={t("teams.removeMemberAria", { name })}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {removingUserId === m.userId ? (
                    <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <UserMinus className="h-3 w-3" />
                  )}
                  {t("teams.removeMember")}
                </SwButton>
              )}
            </div>
          );
        })}
      </div>
      {members.length > GRID_THRESHOLD && (
        <SwButton variant="plain" size="inherit"
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={gridId}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {!expanded && (
            <span className="font-semibold tabular-nums text-accent-foreground">
              +{hidden}
            </span>
          )}
          {expanded ? t("teams.collapseText") : t("teams.viewAll")}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-4 w-4 transition-transform duration-150 motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
          />
        </SwButton>
      )}
      {messageError && (
        <SwAlert as="p" variant="plain" role="alert" className="mt-3 text-sm text-foreground">
          {messageError}
        </SwAlert>
      )}
    </div>
  );
}
