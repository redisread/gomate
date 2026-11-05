import { useEffect, useRef, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/starwind-react/button";
import { useI18n } from "@/hooks/useI18n";
import type { Team } from "@/lib/types";

function CopyDetail({ text, label }: { text: string; label: string }) {
  const { t } = useI18n(["teams"]);
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const fallback = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (state === "error") {
      fallback.current?.focus();
      fallback.current?.select();
    }
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {state === "error" ? (
        <textarea
          ref={fallback}
          readOnly
          value={text}
          aria-label={label}
          className="w-full rounded-lg border border-border bg-background p-2 text-base"
        />
      ) : (
        <p className="select-text whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
          {text}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          type="button"
          variant="plain"
          size="inherit"
          onClick={copy}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          {label}
        </Button>
        <span role="status" className="text-sm text-muted-foreground">
          {state === "copied"
            ? t("teams.copySuccess")
            : state === "error"
              ? t("teams.copyManually")
              : ""}
        </span>
      </div>
    </div>
  );
}

export function TeamMeetingInfo({
  team,
  isLeader,
}: {
  team: Team;
  isLeader: boolean;
}) {
  const { t } = useI18n(["teams"]);
  return (
    <div className="mt-4 space-y-4 rounded-lg bg-secondary p-4">
      <div>
        <h2 className="text-sm font-semibold">{t("teams.meetingPoint")}</h2>
        {team.meetingPoint ? (
          <CopyDetail
            key={team.meetingPoint}
            text={team.meetingPoint}
            label={t("teams.copyMeetingPoint")}
          />
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("teams.meetingPointPending")}
          </p>
        )}
        {isLeader && team.lifecycle === "pending" && !team.meetingPoint && (
          <a
            href={`/teams/${team.id}/edit`}
            className="mt-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("teams.addMeetingPoint")}
          </a>
        )}
      </div>
      {team.leader?.extra.wechat && (
        <div>
          <h3 className="text-sm font-semibold">{t("teams.leaderWechat")}</h3>
          <CopyDetail
            key={team.leader.extra.wechat}
            text={team.leader.extra.wechat}
            label={t("teams.copyLeaderWechat")}
          />
        </div>
      )}
    </div>
  );
}
