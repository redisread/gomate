"use client";

/**
 * task #165（P0-A T2）：Team 详情页「行动本」区块
 *
 * spec：notes/gomate-p0a-team-actionbook-spec.md §3
 * - 顶部 countdown island（独立组件，见 team-countdown.tsx）
 * - 5 个区块 meeting / transport / gear / assignments / notes 平铺
 * - 3 种空态：队长（引导填写）· 队员（提示队长）· 访客（只留时间概览）
 * - 分工认领 optimistic UI（见 use-checklist-claims.ts）
 * - 隐私：SSR 服务端权限判断已确保 non-member 不下发敏感字段；本组件按 props 语义再兜底一次
 *
 * Countdown 单独 client:only 挂载在这里的最外层——因为 SSR 时 Date.now() 会造成 hydration mismatch。
 */

import * as React from "react";
import { MapPin, Car, Backpack, Users, Notebook, Check, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/hooks/useI18n";
import type { Team, TeamMember } from "@/lib/types";
import type { ActionbookAssignment, ActionbookTransportMode, TeamChecklist } from "@gomate/types";
import { TeamCountdown } from "./team-countdown";
import { useChecklistClaims } from "./use-checklist-claims";

interface Props {
  team: Team;
  currentUserId: string | null;
  isLeader: boolean;
  isMember: boolean;
  members: TeamMember[];
  onToast: (opts: { type: "success" | "error"; message: string }) => void;
  refetchTeam: () => Promise<void>;
}

/** 访客 = 未登录 或 已登录但非成员非队长 */
function isVisitor(isLeader: boolean, isMember: boolean): boolean {
  return !isLeader && !isMember;
}

export function TeamActionbookSection({
  team,
  currentUserId,
  isLeader,
  isMember,
  members,
  onToast,
  refetchTeam,
}: Props) {
  const { t } = useI18n(["teams"]);

  // 使用 optimistic hook 管理 checklist 视图（认领时会覆盖 initialChecklist）
  const { checklist, toggleClaim, isPending } = useChecklistClaims({
    teamId: team.id,
    currentUserId,
    initialChecklist: team.checklist,
    onError: (message) => onToast({ type: "error", message }),
    refetch: refetchTeam,
    t,
  });

  // 后端会把访客 checklist 剥为 null；成员身份仍需单独判断，因为队长/成员也可能尚未创建 checklist。
  const visitor = isVisitor(isLeader, isMember);
  const startAt = team.startAt;
  const endAt = team.endAt;

  const hasContent =
    !!checklist &&
    (
      !!checklist.meetingPoint?.name ||
      !!checklist.transport?.mode ||
      !!checklist.gear?.essential?.length ||
      !!checklist.gear?.optional?.length ||
      !!checklist.assignments?.length ||
      !!checklist.notes
    );

  return (
    <section
      className="bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-background rounded-2xl p-6 space-y-5 border border-amber-100 dark:border-amber-900/40"
      data-testid="team-actionbook-section"
    >
      <header className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-amber-600" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">
          {t("teams.actionbook.title")}
        </h2>
      </header>

      <TeamCountdown startAt={startAt} endAt={endAt} />

      {/* 访客视角：只留时间概览 + 提示语（不下发地点/装备/分工） */}
      {visitor && (
        <p className="text-sm text-muted-foreground pt-2 border-t border-amber-100/60 dark:border-amber-900/30">
          {t("teams.actionbook.empty.visitor")}
        </p>
      )}

      {/* 队长空态：引导「完善行动本」 */}
      {!visitor && isLeader && !hasContent && (
        <div className="pt-3 border-t border-amber-100/60 dark:border-amber-900/30 space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("teams.actionbook.empty.leader")}
          </p>
          <a
            href={`/teams/${team.id}/edit#actionbook`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
            data-testid="team-actionbook-cta-complete"
          >
            {t("teams.actionbook.cta.complete")}
          </a>
        </div>
      )}

      {/* 队员空态：提示队长 */}
      {!visitor && !isLeader && isMember && !hasContent && (
        <p className="text-sm text-muted-foreground pt-3 border-t border-amber-100/60 dark:border-amber-900/30">
          {t("teams.actionbook.empty.member")}
        </p>
      )}

      {/* 有内容：分区块渲染 */}
      {!visitor && hasContent && checklist && (
        <div className="space-y-5 pt-3 border-t border-amber-100/60 dark:border-amber-900/30">
          <MeetingPointBlock checklist={checklist} t={t} onToast={onToast} />
          <TransportBlock checklist={checklist} t={t} />
          <GearBlock checklist={checklist} t={t} />
          <AssignmentsBlock
            checklist={checklist}
            members={members}
            currentUserId={currentUserId}
            toggleClaim={toggleClaim}
            isPending={isPending}
            isLeader={isLeader}
            t={t}
          />
          <NotesBlock checklist={checklist} t={t} />
        </div>
      )}
    </section>
  );
}

// ==================== 集合点 ====================

function MeetingPointBlock({
  checklist,
  t,
  onToast,
}: {
  checklist: TeamChecklist;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onToast: (opts: { type: "success" | "error"; message: string }) => void;
}) {
  const mp = checklist.meetingPoint;
  if (!mp?.name) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mp.name);
      onToast({ type: "success", message: t("teams.actionbook.meeting.copied") });
    } catch {
      // 剪贴板失败静默 —— 不打扰用户
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <MapPin className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={handleCopy}
            className="text-base font-medium text-foreground text-left break-words hover:text-amber-700 transition-colors"
            title={t("teams.actionbook.meeting.copyHint")}
            data-testid="team-actionbook-meeting-name"
          >
            {mp.name}
          </button>
          {mp.time && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("teams.actionbook.meeting.timeLabel", { time: mp.time })}
            </p>
          )}
          {mp.note && (
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{mp.note}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 交通 ====================

const TRANSPORT_MODE_KEY: Record<ActionbookTransportMode, string> = {
  self_drive: "teams.actionbook.transportMode.self_drive",
  public: "teams.actionbook.transportMode.public",
  charter: "teams.actionbook.transportMode.charter",
  other: "teams.actionbook.transportMode.other",
};

function TransportBlock({
  checklist,
  t,
}: {
  checklist: TeamChecklist;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const tr = checklist.transport;
  if (!tr?.mode) return null;
  const modeLabel = t(TRANSPORT_MODE_KEY[tr.mode]);
  const detailHint = /拼车|拼|carpool/i.test(tr.detail || "");
  return (
    <div className="flex items-start gap-2">
      <Car className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <span
          className={
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium " +
            (detailHint
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
              : "bg-muted text-foreground")
          }
        >
          {modeLabel}
        </span>
        {tr.detail && (
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{tr.detail}</p>
        )}
      </div>
    </div>
  );
}

// ==================== 装备 ====================

function GearBlock({
  checklist,
  t,
}: {
  checklist: TeamChecklist;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const gear = checklist.gear;
  if (!gear) return null;
  const hasEssential = gear.essential.length > 0;
  const hasOptional = gear.optional.length > 0;
  if (!hasEssential && !hasOptional && !gear.note) return null;
  return (
    <div className="flex items-start gap-2">
      <Backpack className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0 space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">
          {t("teams.actionbook.gearTitle")}
        </h3>
        {hasEssential && (
          <p className="text-sm text-foreground break-words">
            <span className="text-muted-foreground mr-2">{t("teams.actionbook.gear.essentialLabel")}</span>
            {gear.essential.join(" · ")}
          </p>
        )}
        {hasOptional && (
          <p className="text-sm text-muted-foreground break-words">
            <span className="mr-2">{t("teams.actionbook.gear.optionalLabel")}</span>
            {gear.optional.join(" · ")}
          </p>
        )}
        {gear.note && (
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{gear.note}</p>
        )}
      </div>
    </div>
  );
}

// ==================== 分工 ====================

function AssignmentsBlock({
  checklist,
  members,
  currentUserId,
  toggleClaim,
  isPending,
  isLeader,
  t,
}: {
  checklist: TeamChecklist;
  members: TeamMember[];
  currentUserId: string | null;
  toggleClaim: (assignment: ActionbookAssignment) => Promise<void>;
  isPending: (id: string) => boolean;
  isLeader: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  // userId → displayName 索引（Hooks 必须在早返之前）
  const nameById = React.useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => {
      if (member.user) map.set(member.userId, member.user.nickname || member.user.name);
    });
    return map;
  }, [members]);

  const items = checklist.assignments;
  if (!items?.length) return null;

  return (
    <div className="flex items-start gap-2">
      <Users className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">
          {t("teams.actionbook.assignmentsTitle")}
        </h3>
        <ul className="space-y-2">
          {items.map((a) => {
            const claimedByMe = !!currentUserId && a.assigneeIds.includes(currentUserId);
            const pending = isPending(a.id);
            const canInteract = !!currentUserId && !isLeader;
            const claimers = a.assigneeIds
              .map((uid) => nameById.get(uid) || "")
              .filter(Boolean);
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                data-testid={`team-actionbook-assignment-${a.id}`}
              >
                <span className="text-foreground break-words">{a.task}</span>
                {claimers.length > 0 && (
                  <span className="text-muted-foreground">
                    ·{" "}
                    {claimers.map((name, idx) => (
                      <span key={idx} className="inline-flex items-center gap-0.5">
                        {idx > 0 && <span className="mx-0.5">·</span>}
                        <span className="text-foreground">{name}</span>
                        <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                      </span>
                    ))}
                  </span>
                )}
                {canInteract && (
                  <button
                    type="button"
                    onClick={() => toggleClaim(a)}
                    disabled={pending}
                    className={
                      "ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-60 " +
                      (claimedByMe
                        ? "bg-muted text-muted-foreground hover:bg-muted/70"
                        : "bg-amber-600 text-white hover:bg-amber-700")
                    }
                    data-testid={`team-actionbook-claim-btn-${a.id}`}
                    aria-label={claimedByMe ? t("teams.actionbook.claim.unclaim") : t("teams.actionbook.claim.claim")}
                  >
                    {pending && <Loader2 className="w-3 h-3 animate-spin" aria-hidden />}
                    {claimedByMe ? t("teams.actionbook.claim.unclaim") : t("teams.actionbook.claim.claim")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ==================== 其他约定 ====================

function NotesBlock({
  checklist,
  t,
}: {
  checklist: TeamChecklist;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const notes = checklist.notes?.trim();
  if (!notes) return null;
  return (
    <div className="flex items-start gap-2">
      <Notebook className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0 space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">
          {t("teams.actionbook.notesTitle")}
        </h3>
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
