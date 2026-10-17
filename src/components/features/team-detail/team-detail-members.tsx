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
      <div className="flex flex-wrap gap-3">
        {visible.map((m) => {
          const user = m.user;
          if (!user) return null;
          const name = user.nickname || user.name;
          const canRemoveMember =
            canRemoveMembers && !!teamId && m.leftAt === null;

          return (
            <div
              key={m.userId}
              className="relative group flex flex-col items-center gap-1.5"
            >
              <a
                href={`/users/${m.userId}`}
                className="relative flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <div
                  className={cn(
                    "w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150",
                    "bg-secondary ring-1 ring-secondary/50 group-hover:scale-105 group-hover:ring-amber-300",
                  )}
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-semibold text-sm text-stone-500 text-muted-foreground/70">
                      {name?.[0] || "?"}
                    </span>
                  )}
                </div>
                {user.extra.wechat && (
                  <p
                    title={user.extra.wechat}
                    className="text-xs text-muted-foreground min-w-0 truncate text-center leading-tight"
                  >
                    {user.extra.wechat}
                  </p>
                )}
              </a>
              {canRemoveMember && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(m)}
                  disabled={removingUserId === m.userId}
                  aria-label={t("teams.removeMemberAria", { name })}
                  className="inline-flex h-7 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {removingUserId === m.userId ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <UserMinus className="h-3 w-3" />
                  )}
                  {t("teams.removeMember")}
                </button>
              )}
            </div>
          );
        })}

        {!expanded && hidden > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-11 h-11 rounded-full bg-secondary ring-1 ring-secondary/50 flex items-center justify-center transition-colors group-hover:bg-amber-50 group-hover:ring-amber-200">
              <span className="text-xs font-semibold text-muted-foreground/70 group-hover:text-amber-600">
                +{hidden}
              </span>
            </div>
            <p className="text-3xs text-muted-foreground/60">
              {t("teams.viewAll")}
            </p>
          </button>
        )}
      </div>

      {expanded && members.length > GRID_THRESHOLD && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-amber-600 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5 rotate-180" />
          {t("teams.collapseText")}
        </button>
      )}
      {messageError && (
        <p className="mt-3 text-xs text-red-600">{messageError}</p>
      )}
    </div>
  );
}
