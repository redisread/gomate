import * as React from "react";
import { Crown, ChevronDown, Loader2, MessageCircle } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/lib/types";
import { createConversation } from "@/hooks/useMessages";

export function MemberAvatarGrid({
  members,
  leaderId,
  teamId,
  canMessageMembers = false,
}: {
  members: TeamMember[];
  leaderId?: string;
  teamId?: string;
  canMessageMembers?: boolean;
}) {
  const { t } = useI18n(["teams"]);
  const [expanded, setExpanded] = React.useState(false);
  const [messagingUserId, setMessagingUserId] = React.useState<string | null>(null);
  const [messageError, setMessageError] = React.useState<string | null>(null);
  const GRID_THRESHOLD = 8;
  const visible = expanded ? members : members.slice(0, GRID_THRESHOLD);
  const hidden = members.length - GRID_THRESHOLD;

  const handleMessageMember = async (member: TeamMember) => {
    if (!teamId) return;
    setMessagingUserId(member.userId);
    setMessageError(null);
    try {
      const conversation = await createConversation(teamId, member.userId);
      window.location.href = `/messages/${conversation.id}`;
    } catch (err) {
      console.error("Failed to create member conversation:", err);
      setMessageError(t("teams.messageStartFailed"));
    } finally {
      setMessagingUserId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {visible.map((m) => {
          const name = m.nickname || m.name;
          const isLeader = m.userId === leaderId;
          const canMessageMember =
            canMessageMembers &&
            !!teamId &&
            !isLeader &&
            m.status === "approved";

          return (
            <div
              key={m.id}
              className="relative group flex flex-col items-center gap-1.5"
            >
              <a href={`/users/${m.userId}`} className="relative flex flex-col items-center gap-1.5 cursor-pointer">
                <div
                  className={cn(
                    "w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150",
                    isLeader
                      ? "ring-2 ring-amber-400 ring-offset-1 bg-gradient-to-br from-amber-500 to-amber-300 group-hover:ring-amber-300"
                      : "bg-secondary ring-1 ring-secondary/50 group-hover:scale-105 group-hover:ring-amber-300"
                  )}
                >
                  {m.avatar ? (
                    <img src={m.avatar} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span
                      className={cn(
                        "font-semibold text-sm",
                        isLeader ? "text-white" : "text-stone-500 text-muted-foreground/70"
                      )}
                    >
                      {name?.[0] || "?"}
                    </span>
                  )}
                </div>
                {isLeader && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                    <Crown className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
                {m.wechat && (
                  <p className="text-xs text-muted-foreground max-w-[60px] truncate text-center leading-tight">
                    {m.wechat}
                  </p>
                )}
              </a>
              {canMessageMember && (
                <button
                  type="button"
                  onClick={() => handleMessageMember(m)}
                  disabled={messagingUserId === m.userId}
                  aria-label={t("teams.messageMemberAria", { name })}
                  className="inline-flex h-7 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {messagingUserId === m.userId ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <MessageCircle className="h-3 w-3" />
                  )}
                  {t("teams.messageMember")}
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
            <p className="text-3xs text-muted-foreground/60">{t('teams.viewAll')}</p>
          </button>
        )}
      </div>

      {expanded && members.length > GRID_THRESHOLD && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-amber-600 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5 rotate-180" />
          {t('teams.collapseText')}
        </button>
      )}
      {messageError && <p className="mt-3 text-xs text-red-600">{messageError}</p>}
    </div>
  );
}
