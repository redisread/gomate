"use client";

/**
 * task #165（P0-A T2）：行动本区块的集合时刻显示 + 倒计时
 *
 * spec §3.2：
 * - 主标题格式：「明天 07:30」/「今天 20:00」/「周六 07:30」/「7 月 26 日 07:30」
 * - 副标题倒计时：24h 内到分钟，24h 外只显示 X 天，已开始 / 已结束
 * - 分级刷新：>24h 每小时 · <24h 每分钟 · endTime+24h 卸载
 * - 独立 island（本文件由父组件 `client:only` 挂载）——SSR 只渲染静态 fallback，避免 hydration mismatch
 * - 静态显示，不闪烁不动画
 */

import * as React from "react";
import { Clock } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface Props {
  /** V2 Team DTO 的 ISO 起止时间。 */
  startAt: string;
  endAt: string;
}

type CountdownState =
  | { kind: "future"; startMs: number; nowMs: number; msLeft: number }
  | { kind: "started"; startMs: number; nowMs: number; msPast: number }
  | { kind: "ended" };

function computeState(startMs: number, endMs: number, nowMs: number): CountdownState {
  const foldMs = endMs + 24 * 60 * 60 * 1000; // spec §3.2: 已开始 24h 后整块折叠为「已结束」
  if (nowMs >= foldMs) return { kind: "ended" };
  if (nowMs >= startMs) return { kind: "started", startMs, nowMs, msPast: nowMs - startMs };
  return { kind: "future", startMs, nowMs, msLeft: startMs - nowMs };
}

/**
 * spec §3.2：主标题格式
 * - 24h 内且是明天：「明天 HH:MM」
 * - 24h 内且是今天：「今天 HH:MM」
 * - 一周内（不含今天/明天）：「周X HH:MM」
 * - 超过一周：「M 月 D 日 HH:MM」
 */
function formatWhen(
  startMs: number,
  nowMs: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const start = new Date(startMs);
  const now = new Date(nowMs);
  const hh = String(start.getHours()).padStart(2, "0");
  const mm = String(start.getMinutes()).padStart(2, "0");
  const timeStr = `${hh}:${mm}`;

  // 用 y-m-d 判断「同一天」（本地时区），不用毫秒差
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayDiff = Math.round((startDay - nowDay) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) return t("teams.actionbook.countdown.today", { time: timeStr });
  if (dayDiff === 1) return t("teams.actionbook.countdown.tomorrow", { time: timeStr });

  if (dayDiff > 1 && dayDiff < 7) {
    const weekdayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][start.getDay()];
    const weekday = t(`teams.actionbook.weekday.${weekdayKey}`);
    return t("teams.actionbook.countdown.dayOfWeek", { weekday, time: timeStr });
  }

  // 一周以上：由 i18n dateLong 决定日期格式
  return t("teams.actionbook.countdown.dateLong", {
    month: start.getMonth() + 1,
    day: start.getDate(),
    time: timeStr,
  });
}

/** spec §3.2：副标题倒计时 */
function formatRemaining(
  state: CountdownState,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (state.kind === "ended") return t("teams.actionbook.countdown.ended");
  if (state.kind === "started") {
    const hoursPast = Math.floor(state.msPast / (60 * 60 * 1000));
    if (hoursPast === 0) {
      const minPast = Math.max(1, Math.floor(state.msPast / (60 * 1000)));
      return t("teams.actionbook.countdown.startedMinutes", { n: minPast });
    }
    return t("teams.actionbook.countdown.startedHours", { n: hoursPast });
  }
  // future
  const totalMinutes = Math.floor(state.msLeft / (60 * 1000));
  if (totalMinutes < 24 * 60) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return t("teams.actionbook.countdown.remainingHours", { h, m });
  }
  const days = Math.floor(totalMinutes / (60 * 24));
  return t("teams.actionbook.countdown.remainingDays", { d: days });
}

/** 分级刷新间隔：>24h 每小时；<24h 每分钟；已开始 每分钟；已结束 不刷新 */
function nextTick(state: CountdownState): number | null {
  if (state.kind === "ended") return null;
  if (state.kind === "future" && state.msLeft > 24 * 60 * 60 * 1000) return 60 * 60 * 1000;
  return 60 * 1000;
}

export function TeamCountdown({ startAt, endAt }: Props) {
  const { t } = useI18n(["teams"]);
  const startMs = React.useMemo(() => new Date(startAt).getTime(), [startAt]);
  const endMs = React.useMemo(() => new Date(endAt).getTime(), [endAt]);

  const [nowMs, setNowMs] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return;
    const state = computeState(startMs, endMs, nowMs);
    const delay = nextTick(state);
    if (delay === null) return;
    const id = window.setTimeout(() => setNowMs(Date.now()), delay);
    return () => window.clearTimeout(id);
  }, [startMs, endMs, nowMs]);

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null;

  const state = computeState(startMs, endMs, nowMs);
  const whenStr = formatWhen(startMs, nowMs, t);
  const remainingStr = formatRemaining(state, t);

  return (
    <div className="flex flex-col gap-1" data-testid="team-actionbook-countdown">
      <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
        <Clock className="w-6 h-6 text-amber-600" aria-hidden />
        <span>{whenStr}</span>
      </div>
      <p className="text-sm text-muted-foreground pl-8">{remainingStr}</p>
    </div>
  );
}
