import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { AnimatedProgress } from "./team-detail-ui";

/* ── Join Bottom Sheet (Mobile) ── */

export function JoinBottomSheet({
  open, onClose, onJoin, isJoining, joinMessage, setJoinMessage,
  remaining, fillRatio, currentMembers, maxMembers,
}: {
  open: boolean; onClose: () => void; onJoin: () => void; isJoining: boolean;
  joinMessage: string; setJoinMessage: (v: string) => void;
  remaining: number; fillRatio: number; currentMembers: number; maxMembers: number;
}) {
  const { t } = useI18n(["teams"]);
  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="absolute bottom-0 left-0 right-0 bg-popover rounded-t-3xl shadow-xl animate-[slide-up_0.3s_ease_both]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-secondary rounded-full" />
        </div>
        <div className="px-5 pb-5 pt-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground text-lg">{t('teams.joinTeam')}</h3>
              <p className="text-sm text-muted-foreground/70 mt-0.5">
                {remaining === 1 ? t('teams.justNeedYou') : t('teams.stillNeedMore').replace('{remaining}', String(remaining))}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground/70 hover:bg-stone-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mb-4 bg-amber-50/60 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t('teams.alreadyJoinedCount').replace('{current}', String(currentMembers)).replace('{max}', String(maxMembers))}</span>
              <span className="text-xs font-semibold text-amber-600">{fillRatio}%</span>
            </div>
            <AnimatedProgress ratio={fillRatio} isFull={false} />
          </div>
          <textarea
            placeholder={t('teams.joinPlaceholder')}
            value={joinMessage}
            onChange={(e) => setJoinMessage(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none resize-none mb-4 bg-muted border border-border focus:border-amber-400 transition-all"
          />
          <button
            onClick={onJoin}
            disabled={isJoining}
            className="w-full py-3.5 font-semibold text-white rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('teams.joinTeam')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Join Desktop Modal ── */

export function JoinDesktopModal({
  open, onClose, onJoin, isJoining, joinMessage, setJoinMessage,
  remaining, fillRatio, currentMembers, maxMembers,
}: {
  open: boolean; onClose: () => void; onJoin: () => void; isJoining: boolean;
  joinMessage: string; setJoinMessage: (v: string) => void;
  remaining: number; fillRatio: number; currentMembers: number; maxMembers: number;
}) {
  const { t } = useI18n(["teams"]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] hidden lg:flex items-center justify-center p-4">
      <div className="bg-popover rounded-3xl max-w-md w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">{t('teams.joinTeam')}</h3>
            <p className="text-sm text-muted-foreground/70 mt-0.5">
              {remaining === 1 ? t('teams.justNeedYou') : t('teams.stillNeedMore').replace('{remaining}', String(remaining))}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground/70 hover:bg-stone-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mb-4 bg-amber-50/60 rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{t('teams.alreadyJoinedCount').replace('{current}', String(currentMembers)).replace('{max}', String(maxMembers))}</span>
            <span className="text-xs font-semibold text-amber-600">{fillRatio}%</span>
          </div>
          <AnimatedProgress ratio={fillRatio} isFull={false} />
        </div>
        <textarea
          data-testid="team-join-message"
          placeholder={t('teams.joinPlaceholder')}
          value={joinMessage}
          onChange={(e) => setJoinMessage(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 rounded-2xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none resize-none mb-4 bg-muted border border-border focus:border-amber-400 transition-all"
        />
        <button
          data-testid="team-join-submit"
          onClick={onJoin}
          disabled={isJoining}
          className="w-full py-3.5 font-semibold text-white rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('teams.joinTeam')}
        </button>
      </div>
    </div>
  );
}

/* ── Leave Confirm ── */

export function LeaveConfirmDialog({
  open, onCancel, onConfirm,
}: { open: boolean; onCancel: () => void; onConfirm: () => void; }) {
  const { t } = useI18n(["teams", "common"]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-popover rounded-3xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]">
        <h3 className="text-lg font-bold text-foreground mb-2">{t('teams.leaveTeamConfirm')}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t('teams.leaveTeamWarning')}</p>
        <button onClick={onConfirm} className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors mb-2">
          {t('teams.leaveTeam')}
        </button>
        <button onClick={onCancel} className="w-full py-3 rounded-2xl text-muted-foreground text-sm font-medium hover:bg-accent transition-colors">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

/* ── Form Team Confirm ── */

export function FormTeamConfirmDialog({
  open, isFull, isLoading, onCancel, onConfirm,
}: { open: boolean; isFull: boolean; isLoading: boolean; onCancel: () => void; onConfirm: () => void; }) {
  const { t } = useI18n(["teams", "common"]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-popover rounded-3xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]">
        <h3 className="text-lg font-bold text-foreground mb-2">
          {isFull ? t('teams.formTeamConfirm') : t('teams.formTeamUnderfilledConfirm')}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t('teams.formTeamWarning')}</p>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-sm font-semibold transition-colors mb-2 flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('teams.confirmFormTeam')}
        </button>
        <button onClick={onCancel} disabled={isLoading} className="w-full py-3 rounded-2xl text-muted-foreground text-sm font-medium hover:bg-accent transition-colors">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

/* ── Wechat Edit Modal ── */

export function WechatEditModal({
  onClose, onSave, isSaving,
}: { onClose: () => void; onSave: (wechat: string) => void; isSaving: boolean; }) {
  const { t } = useI18n(["profile", "common"]);
  const [wechatInput, setWechatInput] = React.useState("");

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">{t('profile.wechat')}</h3>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{t('profile.wechatHint')}</p>
          </div>
          <button onClick={onClose} disabled={isSaving} className="text-muted-foreground/70 hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <input
          type="text"
          value={wechatInput}
          onChange={(e) => setWechatInput(e.target.value)}
          placeholder={t('profile.wechatPlaceholder')}
          className="w-full px-4 py-3 bg-muted rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-amber-200 border border-border"
        />
        <button
          onClick={() => onSave(wechatInput)}
          disabled={isSaving || !wechatInput.trim()}
          className="w-full py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mb-2"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('teams.saveBtn')}
        </button>
        <button
          onClick={onClose}
          disabled={isSaving}
          className="w-full py-3 text-muted-foreground text-sm hover:bg-accent rounded-xl transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

/* ── Approval Confirm (generic approve/reject) ── */

export function ApprovalConfirmDialog({
  open, type, userName, isLoading, onCancel, onConfirm,
}: {
  open: boolean; type: "approve" | "reject"; userName: string;
  isLoading: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const { t } = useI18n(["teams", "common"]);
  if (!open) return null;
  const isApprove = type === "approve";
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-popover rounded-3xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]">
        <h3 className="text-lg font-bold text-foreground mb-2">
          {isApprove ? t('teams.approveConfirm') : t('teams.rejectConfirm')}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {isApprove ? t('teams.approveUserJoined').replace('{userName}', userName) : t('teams.rejectUserCannotJoin').replace('{userName}', userName)}
        </p>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={cn(
            "w-full py-3 rounded-2xl text-white text-sm font-semibold transition-colors mb-2 flex items-center justify-center gap-2",
            isApprove ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600" : "bg-red-500 hover:bg-red-600"
          )}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isApprove ? t('teams.approveBtn') : t('teams.rejectBtn')}
        </button>
        <button onClick={onCancel} disabled={isLoading} className="w-full py-3 rounded-2xl text-muted-foreground text-sm font-medium hover:bg-accent transition-colors">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
