import * as React from "react";
import { Calendar, Users, MapPin, XCircle, CheckCircle, Loader2 } from "lucide-react";
import { copy } from "@/lib/copy";
import { formatTimeAgo } from "@/lib/date-utils";
import type { PendingApproval } from "./my-teams-types";

const c = copy.myTeams;

const levelConfig: Record<string, { label: string; emoji: string; color: string }> = {
  beginner: { label: c.levelBeginner, emoji: "🌱", color: "bg-green-50 text-green-700 border border-green-200" },
  intermediate: { label: c.levelIntermediate, emoji: "🥾", color: "bg-blue-50 text-blue-700 border border-blue-200" },
  advanced: { label: c.levelAdvanced, emoji: "⛰️", color: "bg-purple-50 text-purple-700 border border-purple-200" },
  expert: { label: c.levelExpert, emoji: "🏔️", color: "bg-amber-50 text-amber-700 border border-amber-200" },
};

export function ApprovalDetailModal({ approval, isProcessing, onApprove, onReject, onClose }: {
  approval: PendingApproval; isProcessing: boolean;
  onApprove: () => Promise<void>; onReject: () => Promise<void>; onClose: () => void;
}) {
  const applicant = approval.applicant;
  if (!applicant) return null;
  const lv = levelConfig[applicant.level];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-400 to-amber-600" />
        <div className="p-6">
          <div className="flex flex-col items-center mb-5">
            <div className="w-20 h-20 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center overflow-hidden mb-3 ring-4 ring-amber-50">
              {applicant.avatar ? (
                <img src={applicant.avatar} alt={applicant.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-stone-500 dark:text-stone-500">{applicant.name?.charAt(0) || "?"}</span>
              )}
            </div>
            <h3 className="text-xl font-bold text-foreground">{applicant.name}</h3>
            {lv ? (
              <span className={`mt-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${lv.color}`}>{lv.emoji} {lv.label}</span>
            ) : (
              <span className="mt-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-500">{applicant.level}</span>
            )}
          </div>
          {applicant.bio ? (
            <div className="mb-4 pl-4 border-l-4 border-amber-300 py-1">
              <p className="text-sm text-stone-600 dark:text-stone-500 italic leading-relaxed">{applicant.bio}</p>
            </div>
          ) : (
            <p className="mb-4 text-sm text-stone-400 dark:text-stone-500 text-center">{c.noBio}</p>
          )}
          {applicant.wechat && (
            <div className="mb-4 flex items-center gap-2 text-sm text-stone-600 dark:text-stone-500 bg-stone-50 dark:bg-stone-900 rounded-xl px-4 py-2.5">
              <span className="font-medium text-stone-700 dark:text-stone-300">微信：</span>
              <span className="text-stone-600 dark:text-stone-500">{applicant.wechat}</span>
            </div>
          )}
          {approval.team && (
            <div className="mb-4 bg-stone-50 dark:bg-stone-900 rounded-2xl p-4">
              <p className="text-xs text-stone-400 dark:text-stone-500 mb-2 font-medium uppercase tracking-wide">申请加入的队伍</p>
              <p className="font-semibold text-stone-800 mb-2">{approval.team.title}</p>
              <div className="flex flex-wrap gap-3 text-xs text-stone-500 dark:text-stone-500">
                {approval.team.date && (
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{approval.team.date}</span>
                )}
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{approval.team.currentMembers}/{approval.team.maxMembers}人</span>
                {approval.team.location?.name && (
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{approval.team.location.name}</span>
                )}
              </div>
            </div>
          )}
          <p className="text-xs text-stone-400 dark:text-stone-500 text-center mb-5">
            {c.applyTime}：{formatTimeAgo(approval.createdAt)}
          </p>
          <div className="flex gap-3">
            <button onClick={onReject} disabled={isProcessing}
              className="flex-1 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 py-3 rounded-2xl font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2">
              <XCircle className="h-4 w-4" />{c.rejectBtn}
            </button>
            <button onClick={onApprove} disabled={isProcessing}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-2xl font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-200">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {c.approveBtn}
            </button>
          </div>
          <button onClick={onClose}
            className="mt-3 w-full text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:text-stone-500 py-2 transition-colors">
            暂不处理
          </button>
        </div>
      </div>
    </div>
  );
}

export function RejectConfirmModal({ isOpen, isProcessing, onConfirm, onCancel }: {
  isOpen: boolean; isProcessing: boolean; onConfirm: () => Promise<void>; onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-card rounded-3xl max-w-sm w-full p-6 shadow-2xl">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="h-6 w-6 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2 text-center">{c.rejectConfirmTitle}</h2>
        <p className="text-sm text-stone-500 dark:text-stone-500 mb-6 text-center">{c.rejectConfirmDesc}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:bg-stone-900 py-3 rounded-2xl font-semibold transition-colors">
            {c.cancelBtn}
          </button>
          <button onClick={onConfirm} disabled={isProcessing}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : c.confirmRejectBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CancelTeamModal({ teamId, isCancelling, onConfirm, onCancel }: {
  teamId: string | null; isCancelling: boolean; onConfirm: () => Promise<void>; onCancel: () => void;
}) {
  if (!teamId) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both] motion-reduce:animate-none">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-foreground">{copy.teams.cancelTeam}</h3>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-500 leading-relaxed mb-5">{copy.teams.cancelTeamConfirm}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={isCancelling}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-500 text-sm font-medium hover:bg-stone-50 dark:bg-stone-900 transition-colors disabled:opacity-50">
            {copy.common.cancel}
          </button>
          <button onClick={onConfirm} disabled={isCancelling}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {isCancelling && <Loader2 className="h-4 w-4 animate-spin" />}{copy.teams.cancelTeam}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FormTeamModal({ teamId, isFull, isForming, onConfirm, onCancel }: {
  teamId: string | null; isFull: boolean; isForming: boolean; onConfirm: () => Promise<void>; onCancel: () => void;
}) {
  if (!teamId) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both] motion-reduce:animate-none">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-amber-500" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {isFull ? copy.teams.formTeamConfirm : copy.teams.formTeamUnderfilledConfirm}
          </h3>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-500 leading-relaxed mb-5">{copy.teams.formTeamWarning}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={isForming}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-500 text-sm font-medium hover:bg-stone-50 dark:bg-stone-900 transition-colors disabled:opacity-50">
            {copy.common.cancel}
          </button>
          <button onClick={onConfirm} disabled={isForming}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-sm font-medium hover:from-amber-700 hover:to-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {isForming && <Loader2 className="h-4 w-4 animate-spin" />}
            {isFull ? copy.teams.formTeam : copy.teams.formTeamUnderfilled}
          </button>
        </div>
      </div>
    </div>
  );
}
