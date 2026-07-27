/**
 * P1-1 T2 (task #188) — 首次引导流 modal（3 步：偏好 → 推荐 → 申请已提交）
 *
 * spec: notes/gomate-p1-1-onboarding-spec.md v1.2 §3-§8
 *
 * - 全屏 modal（半透明遮罩 + 居中卡片 max-w-md，移动端全屏），React state 切步不刷页
 * - 偏好卡复用 getRoleConfig() 视觉（emoji + gradient + iconColor，零新增色板，§3.4）
 * - 「换一个」候选池纯客户端轮播零请求（§5.3）
 * - wechat 内联收集：PATCH → join 串行，合并 loading，失败如实报错（§6.4 / §10）
 * - join 400（满员/已申请/停止招募）→ toast + 自动切下一候选（§5.3）
 * - 成功页「申请已提交 / 审核期间留意队伍页面」口径，不设 checklist CTA（§6.3）
 * - 跳过 / 不再提示 / Esc 关闭语义见 §7
 */

"use client";

import * as React from "react";
import { Check, Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useToast } from "@/hooks/useToast";
import { useModalA11y } from "@/hooks/useModalA11y";
import { fetchAPI } from "@/lib/api";
import type { SessionUser } from "@/lib/types";
import { getRoleConfig } from "@/components/features/locations/constants";
import {
  useOnboardingGate,
  fetchRecommend,
  saveOnboardingPreference,
  markOnboardingSeen,
  markOnboardingDismissed,
} from "./use-onboarding";
import type { RecommendOnboardingResponse, OnboardingCandidate, PreferenceType } from "./types";

const PREFERENCE_TYPES: PreferenceType[] = ["hiking", "explore", "leisure", "travel"];

/** 「周六 07:30」格式（复用 team-countdown 的 i18n key 口径：today/tomorrow/dayOfWeek/dateLong） */
function formatStartTime(startISO: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) return "";
  const timeStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const now = new Date();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayDiff = Math.round((startDay - nowDay) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) return t("teams.actionbook.countdown.today", { time: timeStr });
  if (dayDiff === 1) return t("teams.actionbook.countdown.tomorrow", { time: timeStr });
  if (dayDiff > 1 && dayDiff < 7) {
    const weekdayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][start.getDay()];
    const weekday = t(`teams.actionbook.weekday.${weekdayKey}`);
    return t("teams.actionbook.countdown.dayOfWeek", { weekday, time: timeStr });
  }
  return t("teams.actionbook.countdown.dateLong", {
    month: start.getMonth() + 1,
    day: start.getDate(),
    time: timeStr,
  });
}

export function OnboardingModal() {
  const gate = useOnboardingGate();
  if (gate.status !== "open") return null;
  return <OnboardingModalInner user={gate.user} initial={gate.initial} />;
}

function OnboardingModalInner({ user, initial }: { user: SessionUser; initial: RecommendOnboardingResponse }) {
  const { t } = useI18n(["onboarding", "locations", "teams", "common"]);
  const { show: showToast } = useToast();
  const roleConfig = getRoleConfig(t);

  const [closed, setClosed] = React.useState(false);
  const [animatingOut, setAnimatingOut] = React.useState(false);
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [pool, setPool] = React.useState<RecommendOnboardingResponse>(initial);
  const [poolIndex, setPoolIndex] = React.useState(0);
  const [loadingPool, setLoadingPool] = React.useState(false);
  const [wechatInput, setWechatInput] = React.useState("");
  const [showWechatForm, setShowWechatForm] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const panelRef = React.useRef<HTMLDivElement | null>(null);

  // Round 3 §D: 出场动画后关闭（延迟 marker 写入）
  const animateOut = React.useCallback((onComplete: () => void) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onComplete();
      return;
    }
    setAnimatingOut(true);
    setTimeout(() => {
      setAnimatingOut(false);
      onComplete();
    }, 200);
  }, []);

  // §7：跳过 = 本设备已看过；marker 延迟到出场后写入
  const closeAsSkip = React.useCallback(() => {
    if (animatingOut) return;
    animateOut(() => {
      markOnboardingSeen();
      setClosed(true);
    });
  }, [animateOut, animatingOut]);

  // 放弃并永久隐藏（§7）：先 confirm → 通过才 animateOut + marker 延迟写入
  const confirmDismiss = React.useCallback(() => {
    if (animatingOut) return;
    if (window.confirm(t("onboarding.dismiss"))) {
      animateOut(() => {
        markOnboardingDismissed();
        setClosed(true);
      });
    }
  }, [animateOut, animatingOut, t]);

  // Esc / focus trap / 焦点还原（Esc = 跳过语义）
  useModalA11y(!closed && !animatingOut, panelRef, closeAsSkip);

  if (closed) return null;

  const candidate: OnboardingCandidate | undefined = pool.candidates[poolIndex];

  /** 第 1 步：选偏好 → 立即进第 2 步（§4.2）；「都可以」复用 gating 时已取的无 type 池 */
  const choosePreference = async (pref: PreferenceType | "") => {
    saveOnboardingPreference(pref);
    if (!pref) {
      setPool(initial);
      setPoolIndex(0);
      setStep(2);
      return;
    }
    setLoadingPool(true);
    const data = await fetchRecommend(pref);
    setLoadingPool(false);
    // 拉取失败 → 用无 type 池兜底进第 2 步（好过卡死）
    setPool(data ?? initial);
    setPoolIndex(0);
    setStep(2);
  };

  /** 「换一个」：池内轮播零请求（§5.3） */
  const swapCandidate = () => {
    if (pool.candidates.length > 1) setPoolIndex((i) => (i + 1) % pool.candidates.length);
  };

  /** 申请加入：wechat 空 → 内联收集后 PATCH+join 串行；否则直接 join（§6.2/§6.4/§10） */
  const applyToTeam = async () => {
    if (!candidate) return;
    if (!user.wechat && !showWechatForm) {
      setShowWechatForm(true);
      return;
    }
    const wechat = wechatInput.trim();
    if (!user.wechat && !wechat) return; // 内联态空输入不提交（按钮 disabled 兜底）

    setSubmitting(true);
    try {
      // ① wechat 内联收集：先 PATCH（§6.4）
      if (!user.wechat) {
        const patchRes = await fetchAPI("/api/users/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, wechat }),
        });
        const patchData = await patchRes.json();
        if (!(patchData.success || patchData.user)) {
          showToast({ type: "error", message: t("teams.toast.wechatSaveFailed") });
          return;
        }
      }

      // ② POST join（§6.2）
      const joinRes = await fetchAPI(`/api/teams/${candidate.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "" }),
      });
      const joinData = await joinRes.json();

      if (joinData.success) {
        markOnboardingSeen(); // §7：完成第 3 步 → seen
        setStep(3);
      } else {
        // §5.3：提交瞬间满员/已申请/停止招募 → toast + 自动切下一候选
        showToast({ type: "info", message: t("onboarding.teamFull.toast") });
        swapCandidate();
      }
    } catch {
      showToast({ type: "error", message: t("teams.toast.networkError") });
    } finally {
      setSubmitting(false);
    }
  };

  /** 第 3 步关闭：出场动画后关闭（marker 已在 join 时写入） */
  const closeStep3 = React.useCallback(() => {
    if (animatingOut) return;
    animateOut(() => setClosed(true));
  }, [animateOut, animatingOut]);

  const dots = (active: number) => (
    <div className="flex justify-center gap-1.5 mb-4" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`w-2 h-2 rounded-full ${n <= active ? "bg-amber-600" : "bg-stone-300 dark:bg-stone-700"}`}
        />
      ))}
    </div>
  );

  const skipButton = (
    <button
      type="button"
      onClick={closeAsSkip}
      className="mx-auto block text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
    >
      {t("onboarding.skip")}
    </button>
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 sm:p-4 ${animatingOut ? "animate-overlay-out" : "animate-overlay-in"}`}
      data-testid="onboarding-modal"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`w-full h-full sm:h-auto sm:max-w-md bg-white dark:bg-stone-900 sm:rounded-2xl shadow-xl p-6 sm:p-8 overflow-y-auto ${animatingOut ? "animate-panel-out" : "animate-panel-in"}`}
      >
        {/* ─── 第 1 步：偏好 ─── */}
        {step === 1 && (
          <div>
            {dots(1)}
            <h2 className="text-xl font-bold text-center text-foreground mb-2">{t("onboarding.title.step1")}</h2>
            <p className="text-sm text-center text-stone-500 dark:text-stone-400 mb-6">{t("onboarding.subtitle.step1")}</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {PREFERENCE_TYPES.map((type) => {
                const cfg = roleConfig[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => choosePreference(type)}
                    disabled={loadingPool}
                    data-testid={`onboarding-pref-${type}`}
                    className="flex flex-col items-center gap-1.5 p-4 rounded-xl border border-stone-100 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-800 transition-colors disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${cfg.gradientFrom}, ${cfg.gradientTo})` }}
                  >
                    <span className="text-2xl">{cfg.emoji}</span>
                    <span className="text-sm font-semibold" style={{ color: cfg.iconColor }}>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => choosePreference("")}
              disabled={loadingPool}
              className="w-full py-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors disabled:opacity-50 mb-6"
            >
              {loadingPool ? <Loader2 className="inline h-4 w-4 animate-spin" /> : t("onboarding.preference.any")}
            </button>
            {skipButton}
            <p className="mt-3 text-center">
              <button
                type="button"
                onClick={confirmDismiss}
                className="text-xs text-stone-300 dark:text-stone-600 hover:text-stone-500 dark:hover:text-stone-400 transition-colors"
              >
                {t("onboarding.dismiss")}
              </button>
            </p>
          </div>
        )}

        {/* ─── 第 2 步：推荐 ─── */}
        {step === 2 && (
          <div>
            {dots(2)}
            <h2 className="text-xl font-bold text-center text-foreground mb-2">{t("onboarding.title.step2")}</h2>
            {pool.fallbackNoType && (
              <p className="text-sm text-center text-amber-700 dark:text-amber-400 mb-3">{t("onboarding.step2.fallbackNoType")}</p>
            )}

            {candidate ? (
              <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 p-5 mb-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-2xl">{candidate.icon || "⛰️"}</span>
                  <h3 className="text-base font-bold text-foreground">{candidate.title}</h3>
                </div>
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  {candidate.locationType && roleConfig[candidate.locationType as PreferenceType]
                    ? roleConfig[candidate.locationType as PreferenceType].label
                    : candidate.locationName}
                  {" · "}
                  {formatStartTime(candidate.startTime, t)}
                </p>
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
                  {candidate.cityName} · {t("common.memberCount", { current: candidate.approvedCount, max: candidate.maxMembers })}
                </p>

                {showWechatForm ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-300">{t("onboarding.wechat.title")}</p>
                    <input
                      type="text"
                      value={wechatInput}
                      onChange={(e) => setWechatInput(e.target.value)}
                      maxLength={50}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-xs text-stone-400">{t("onboarding.wechat.privacy")}</p>
                    <button
                      type="button"
                      onClick={applyToTeam}
                      disabled={submitting || !wechatInput.trim()}
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t("onboarding.wechat.cta")}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={applyToTeam}
                      disabled={submitting}
                      data-testid="onboarding-join"
                      className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {t("onboarding.recommend.cta.join")}
                    </button>
                    <button
                      type="button"
                      onClick={swapCandidate}
                      disabled={submitting || pool.candidates.length <= 1}
                      className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {t("onboarding.recommend.cta.swap")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // 空池（§5.3）：空态 + 两个出口
              <div className="rounded-2xl border border-stone-100 dark:border-stone-800 p-6 text-center mb-5">
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">{t("onboarding.recommend.empty")}</p>
                <a
                  href="/locations"
                  className="inline-block px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors"
                >
                  {t("onboarding.empty.cta.locations")}
                </a>
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("onboarding.back")}
              </button>
              {skipButton}
            </div>
          </div>
        )}

        {/* ─── 第 3 步：申请已提交（§6.3：非「加入成功」，无 checklist CTA） ─── */}
        {step === 3 && candidate && (
          <div>
            {dots(3)}
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                <Check className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">{t("onboarding.title.step3")}</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">{t("onboarding.success.subtitle")}</p>
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">{t("onboarding.success.next")}</p>
              <div className="flex flex-col gap-2">
                <a
                  href={`/teams/${candidate.id}`}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors text-center"
                >
                  {t("onboarding.success.cta.team")}
                </a>
                <button
                  type="button"
                  onClick={closeStep3}
                  className="w-full py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  {t("onboarding.success.cta.home")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
